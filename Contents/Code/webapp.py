# standard imports
import logging
import os

# plex debugging
try:
    import plexhints  # noqa: F401
except ImportError:
    pass
else:  # the code is running outside of Plex
    from plexhints.core_kit import Core  # core kit
    from plexhints.log_kit import Log  # log kit
    from plexhints.prefs_kit import Prefs  # prefs kit

# lib imports
import flask
from flask import Flask
from flask import render_template, send_from_directory
from flask_babel import Babel

# local imports
from const import bundle_identifier, plugin_logs_directory


# setup flask app
app = Flask(
    import_name=__name__,
    root_path=os.path.join(Core.bundle_path, 'Contents', 'Resources', 'web'),
    static_folder=os.path.join(Core.bundle_path, 'Contents', 'Resources', 'web'),
    template_folder=os.path.join(Core.bundle_path, 'Contents', 'Resources', 'web', 'templates')
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

app.config['BABEL_TRANSLATION_DIRECTORIES'] = os.path.join(Core.bundle_path, 'Contents', 'Strings')

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

if Prefs['bool_log_werkzeug_messages']:
    # get the werkzeug logger
    werkzeug_logger = logging.getLogger('werkzeug')

    # replace the werkzeug logger handlers with the plugin logger handlers
    werkzeug_logger.handlers = plugin_logger.handlers

    # use the same log level as the plugin logger
    werkzeug_logger.setLevel(plugin_logger.level)

    # test message
    werkzeug_logger.info('werkzeug logger test message')


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


@app.route('/')
@app.route('/home')
def home():
    # type: () -> render_template
    """
    Serve the webapp home page.

    .. todo:: This documentation needs to be improved.

    Returns
    -------
    render_template
        The rendered page.

    Notes
    -----
    The following routes trigger this function.

        `/`
        `/home`

    Examples
    --------
    >>> home()
    """
    return render_template('home.html', title='Home')


@app.route('/favicon.ico')
def favicon():
    # type: () -> flask.send_from_directory
    """
    Serve the favicon.ico file.

    .. todo:: This documentation needs to be improved.

    Returns
    -------
    flask.send_from_directory
        The ico file.

    Notes
    -----
    The following routes trigger this function.

        `/favicon.ico`

    Examples
    --------
    >>> favicon()
    """
    return send_from_directory(directory=os.path.join(app.static_folder, 'images'),
                               filename='favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route('/logs/', defaults={'plugin': bundle_identifier})
@app.route('/logs/<path:plugin>')
def logs(plugin):
    # type: (str) -> render_template
    """
    Serve the plugin logs.

    Collect and format the logs for the specified plugin.

    Parameters
    ----------
    plugin : str
        The reverse domain name of the plugin, e.g. `dev.lizardbyte.plugger`.

    Returns
    -------
    render_template
        The logs template with the requested information.

    Notes
    -----
    The following routes trigger this function.

        `/logs/`
        `/logs/<plugin name>`

    Examples
    --------
    >>> logs(plugin='dev.lizardbyte.plugger')
    """

    base_log_file = '%s.log' % plugin
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

    return render_template('logs.html', title='Logs', logs=combined_log)


@app.route('/status')
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
