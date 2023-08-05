# standard imports
import json
import logging
import os
from threading import Thread
import xmltodict

# plex debugging
try:
    import plexhints  # noqa: F401
except ImportError:
    pass
else:  # the code is running outside of Plex
    from plexhints.core_kit import Core  # core kit
    from plexhints.log_kit import Log  # log kit
    from plexhints.parse_kit import Plist  # parse kit
    from plexhints.prefs_kit import Prefs  # prefs kit

# lib imports
import flask
from flask import Flask, Response, render_template, request, send_from_directory
from flask_babel import Babel
import polib
import requests
from werkzeug.utils import secure_filename

# local imports
from const import bundle_identifier, plex_base_url, plex_token, plugin_directory, plugin_logs_directory, \
    system_plugins_directory
import plugin_manager

bundle_path = Core.bundle_path
if bundle_path.endswith('test.bundle'):
    # use current directory instead, to allow for testing outside of Plex
    bundle_path = os.getcwd()

# setup flask app
app = Flask(
    import_name=__name__,
    root_path=os.path.join(bundle_path, 'Contents', 'Resources', 'web'),
    static_folder=os.path.join(bundle_path, 'Contents', 'Resources', 'web'),
    template_folder=os.path.join(bundle_path, 'Contents', 'Resources', 'web', 'templates')
    )

# remove extra lines rendered jinja templates
app.jinja_env.trim_blocks = True
app.jinja_env.lstrip_blocks = True

# localization
babel = Babel(
    app=app,
    default_locale='en',
    default_timezone='UTC',
    default_domain='plugger',
    configure_jinja=True
)

app.config['BABEL_TRANSLATION_DIRECTORIES'] = os.path.join(bundle_path, 'Contents', 'Strings')

# setup logging for flask
Log.Info('Adding flask log handlers to plex plugin logger')
# Log.Debug('loggers: %s' % logging.Logger.manager.loggerDict.keys())
# Log.Debug('loggers: %s' % logging.Logger.manager.loggerDict)

# get the plugin logger
plugin_logger = logging.getLogger(bundle_identifier)

# replace the app.logger handlers with the plugin logger handlers
app.logger.handlers = plugin_logger.handlers
app.logger.setLevel(plugin_logger.level)

# test message
app.logger.info('flask app logger test message')

try:
    Prefs['bool_log_werkzeug_messages']
except KeyError:
    # this fails when building docs
    pass
else:
    if Prefs['bool_log_werkzeug_messages']:
        # get the werkzeug logger
        werkzeug_logger = logging.getLogger('werkzeug')

        # replace the werkzeug logger handlers with the plugin logger handlers
        werkzeug_logger.handlers = plugin_logger.handlers

        # use the same log level as the plugin logger
        werkzeug_logger.setLevel(plugin_logger.level)

        # test message
        werkzeug_logger.info('werkzeug logger test message')


# default plex headers
PLEX_HEADERS = {
    'X-Plex-Token': plex_token,
}


# global objects
plugin_directories = [
    plugin_directory,
    system_plugins_directory,
]
plugins = dict()

# mime type map
mime_type_map = {
    'gif': 'image/gif',
    'ico': 'image/vnd.microsoft.icon',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'svg': 'image/svg+xml',
}


@babel.localeselector
def get_locale():
    # type: () -> str
    """
    Get the locale from the config.

    Get the locale specified in the config. This does not need to be called as it is done so automatically by `babel`.

    Returns
    -------
    str
        The locale.

    See Also
    --------
    pyra.locales.get_locale : Use this function instead.

    Examples
    --------
    >>> get_locale()
    en
    """
    return Prefs['enum_locale']


def start_server():
    # use threading to start the flask app... or else web server seems to be killed after a couple of minutes
    flask_thread = Thread(
        target=app.run,
        kwargs=dict(
            host=Prefs['str_http_host'],
            port=Prefs['int_http_port'],
            debug=False,
            use_reloader=False  # reloader doesn't work when running in a separate thread
        )
    )

    # start flask application
    flask_thread.start()


def stop_server():
    # stop flask server
    # todo - this doesn't work
    request.environ.get('werkzeug.server.shutdown')


@app.route('/', methods=["GET"])
@app.route('/home', methods=["GET"])
def home():
    # type: () -> render_template
    """
    Serve the webapp home page.

    This page is where most of the functionality for Plugger is provided.

    Returns
    -------
    render_template
        The rendered page.

    Notes
    -----
    The following routes trigger this function.

        - `/`
        - `/home`

    Examples
    --------
    >>> home()
    """
    return render_template('home.html', title='Home')


@app.route("/<path:img>", methods=["GET"])
def image(img):
    # type: (str) -> flask.send_from_directory
    """
    Get image from static/images directory.

    Returns
    -------
    flask.send_from_directory
        The image.

    Notes
    -----
    The following routes trigger this function.

        - `/favicon.ico`

    Examples
    --------
    >>> image('favicon.ico')
    """
    directory = os.path.join(app.static_folder, 'images')
    filename = os.path.basename(secure_filename(filename=img))  # sanitize the input

    if os.path.isfile(os.path.join(directory, filename)):
        file_extension = filename.rsplit('.', 1)[-1]
        if file_extension in mime_type_map:
            return send_from_directory(directory=directory, filename=filename, mimetype=mime_type_map[file_extension])
        else:
            return Response(response='Invalid file type', status=400, mimetype='text/plain')
    else:
        return Response(response='Image not found', status=404, mimetype='text/plain')


@app.route('/api/plugin/install/', methods=["POST"])
def install_plugin():
    # type: () -> Response
    """
    Install a plugin.
    """
    data = request.get_json(force=True)

    install_status = plugin_manager.initialize_install(plugin_data=data)


# get list of installed plugins in json format
@app.route('/installed_plugins/', methods=["GET"])
def installed_plugins():
    # type: () -> Response
    """
    Serve the list of installed plugins.
    """
    # plugins known to the server
    plugin_list_xml = requests.get(url='%s/:/plugins' % plex_base_url, headers=PLEX_HEADERS).content
    # convert the plugin_list xml data to json
    known_plugin_list = xmltodict.parse(plugin_list_xml)['MediaContainer']['Plugin']

    known_plugin_identifiers = [plugin['@identifier'] for plugin in known_plugin_list]

    # walk plugin directory
    for plugin_dir in plugin_directories:
        for plugin in os.listdir(plugin_dir):
            # set default plugin type and version
            plugin_type = 'user'
            version = None

            # get the path of the plugin
            plugin_path = os.path.join(plugin_dir, plugin)

            # get the path to the plist file
            plist_file_path = os.path.join(plugin_path, 'Contents', 'Info.plist')

            # for system plugins, set the plugin type and get the version from the VERSION file
            if plugin_dir == system_plugins_directory:
                plugin_type = 'system'
                version_file_path = os.path.join(plugin_path, 'Contents', 'VERSION')
                if os.path.isfile(version_file_path):
                    version = str(Core.storage.load(filename=version_file_path, binary=False))

            # the plugger data file
            plugger_data = None
            if plugin_dir == plugin_directory:
                plugger_data_file_path = os.path.join(plugin_path, 'plugger.json')

                # load plugger json file
                if os.path.isfile(plugger_data_file_path):
                    plugger_data = json.loads(s=str(Core.storage.load(filename=plugger_data_file_path, binary=False)))

                # set the version from the plugger data
                if plugger_data:
                    version = plugger_data.get('version', None)

            # get the bundle identifier from the plist file
            if os.path.isfile(plist_file_path):
                plist_contents = Plist.ObjectFromString(str(Core.storage.load(filename=plist_file_path, binary=False)))
                try:
                    plugin_identifier = plist_contents['CFBundleIdentifier']
                except KeyError:
                    Log.Error('CFBundleIdentifier not found in plist file: %s' % plist_file_path)
                else:
                    try:
                        plugin_description = plist_contents['PlexAgentAttributionText']
                    except KeyError:
                        plugin_description = None

                    if plugin_identifier in known_plugin_identifiers:
                        plugins[plugin_identifier] = dict(
                            bundle=plugin,
                            bundle_identifier=plugin_identifier,
                            name=plugin.split('.bundle')[0],
                            description=plugin_description,
                            path=plugin_path,
                            type=plugin_type,
                            version=version,
                            plugger_data=plugger_data,
                        )
                    else:
                        Log.Error('Plugin not properly loaded in Plex Media Server: %s' % plugin_identifier)
            else:
                Log.Error('Info.plist not found in plugin directory: %s' % plugin_path)

    return Response(response=json.dumps(plugins, sort_keys=True),
                    status=200,
                    mimetype='application/json')


@app.route('/logs/', defaults={'plugin_identifier': bundle_identifier}, methods=["GET"])
@app.route('/logs/<path:plugin_identifier>', methods=["GET"])
def logs(plugin_identifier):
    # type: (str) -> render_template
    """
    Serve the plugin logs.

    Collect and format the logs for the specified plugin.

    Parameters
    ----------
    plugin_identifier : str
        The reverse domain name of the plugin, e.g. `dev.lizardbyte.plugger`.

    Returns
    -------
    render_template
        The logs template with the requested information.

    Notes
    -----
    The following routes trigger this function.

        - `/logs/`
        - `/logs/<plugin name>`

    Examples
    --------
    >>> logs(plugin_identifier='dev.lizardbyte.plugger')
    """
    return render_template('logs.html', title='Logs', plugin_identifier=plugin_identifier)


@app.route('/log_stream/', defaults={'plugin_identifier': bundle_identifier}, methods=["GET"])
@app.route("/log_stream/<path:plugin_identifier>", methods=["GET"])
def log_stream(plugin_identifier):
    # type: (str) -> Response
    """
    Serve the plugin logs in plain text.

    Collect and format the logs for the specified plugin.

    Parameters
    ----------
    plugin_identifier : str
        The reverse domain name of the plugin, e.g. `dev.lizardbyte.plugger`.

    Returns
    -------
    Response
        The text of the log files.

    Notes
    -----
    The following routes trigger this function.

        - `/log_stream/`
        - `/log_stream/<plugin name>`

    Examples
    --------
    >>> log_stream(plugin_identifier='dev.lizardbyte.plugger')
    """
    base_log_file = '%s.log' % plugin_identifier
    combined_log = ''

    count = 5
    while count >= 0:
        if count > 0:
            log_file_name = '%s.%s' % (base_log_file, count)
        else:
            log_file_name = base_log_file

        log_file = os.path.join(plugin_logs_directory, log_file_name)
        if os.path.isfile(log_file):
            # cannot use normal `with open()` as it does not work inside of Plex plugin framework
            # must use `str()` or Plex re-writes the final log file with the contents of all log files
            combined_log += str(Core.storage.load(filename=log_file, binary=False))
        count += -1

    return Response(combined_log, mimetype="text/plain", content_type="text/event-stream")


@app.route('/status', methods=["GET"])
def status():
    # type: () -> dict
    """
    Check the status of Plugger.

    This is useful for a healthcheck from Docker, and may have many other uses in the future.

    Returns
    -------
    dict
        A dictionary of the status.

    Examples
    --------
    >>> status()
    """
    web_status = {'result': 'success', 'message': 'Ok'}
    return web_status


@app.route("/thumbnail/<path:plugin_identifier>", methods=["GET"])
def thumbnail(plugin_identifier):
    # see if plugin_identifier is in plugins
    if plugin_identifier in plugins:
        plugin_path = plugins[plugin_identifier]['path']
    else:
        return Response(response='Plugin not found', status=404, mimetype='text/plain')

    # try to get the plugin thumbnail
    plugin_thumbnail = None
    image_priotity = [
        'icon-default',
        'attribution'
    ]
    image_extensions = [
        'png',
        'jpg',
        'jpeg',
    ]
    for img in image_priotity:
        if plugin_thumbnail:
            break  # break first loop
        for extension in image_extensions:
            plugin_thumbnail_path = os.path.join(plugin_path, 'Contents', 'Resources', '%s.%s' % (
                img, extension))
            if os.path.isfile(plugin_thumbnail_path):
                plugin_thumbnail = (os.path.dirname(plugin_thumbnail_path),
                                    os.path.basename(plugin_thumbnail_path))
                break  # break second loop
    if not plugin_thumbnail:
        plugin_thumbnail = (os.path.join(app.static_folder, 'images'), 'default-thumb.png')

    # get file extension
    image_extension = plugin_thumbnail[1].split('.')[-1]

    return send_from_directory(directory=plugin_thumbnail[0], filename=plugin_thumbnail[1],
                               mimetype=mime_type_map[image_extension])


@app.route("/translations", methods=["GET"])
def translations():
    # type: () -> Response
    """
    Serve the translations.

    Returns
    -------
    Response
        The translations.

    Examples
    --------
    >>> translations()
    """
    locale = get_locale()

    po_files = [
        '%s/%s/LC_MESSAGES/plugger.po' % (app.config['BABEL_TRANSLATION_DIRECTORIES'], locale),  # selected locale
        '%s/plugger.po' % app.config['BABEL_TRANSLATION_DIRECTORIES'],  # fallback to default domain
    ]

    for po_file in po_files:
        if os.path.isfile(po_file):
            po = polib.pofile(po_file)

            # convert the po to json
            data = dict()
            for entry in po:
                if entry.msgid:
                    data[entry.msgid] = entry.msgstr
                    Log.Debug('Translation: %s -> %s' % (entry.msgid, entry.msgstr))

            return Response(response=json.dumps(data),
                            status=200,
                            mimetype='application/json')
