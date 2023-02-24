# -*- coding: utf-8 -*-

# standard imports
import sys
from threading import Thread

# plex debugging
try:
    import plexhints  # noqa: F401
except ImportError:
    pass
else:  # the code is running outside of Plex
    from plexhints import plexhints_setup, update_sys_path
    plexhints_setup()  # read the plugin plist file and determine if plexhints should use elevated policy or not
    update_sys_path()  # when running outside plex, append the path

    from plexhints.decorator_kit import handler  # decorator kit
    from plexhints.log_kit import Log  # log kit
    from plexhints.object_kit import MessageContainer  # object kit
    from plexhints.prefs_kit import Prefs  # prefs kit

# local imports
from default_prefs import default_prefs
from webapp import app


def ValidatePrefs():
    # type: () -> MessageContainer
    """
    Validate plug-in preferences.

    This function is called when the user modifies their preferences. The developer can check the newly provided values
    to ensure they are correct (e.g. attempting a login to validate a username and password), and optionally return a
    ``MessageContainer`` to display any error information to the user. See the archived Plex documentation
    `Predefined functions
    <https://web.archive.org/web/https://dev.plexapp.com/docs/channels/basics.html#predefined-functions>`_
    for more information.

    Returns
    -------
    MessageContainer
        Success or Error message dependeing on results of validation.

    Examples
    --------
    >>> ValidatePrefs()
    ...
    """
    # todo - validate username and password
    error_message = ''  # start with a blank error message

    for key in default_prefs:
        try:
            Prefs[key]
        except KeyError:
            Log.Critical("Setting '%s' missing from 'DefaultPrefs.json'" % key)
            error_message += "Setting '%s' missing from 'DefaultPrefs.json'<br/>" % key
        else:
            # test all types except 'str_' as string cannot fail
            if key.startswith('int_'):
                try:
                    int(Prefs[key])
                except ValueError:
                    Log.Error("Setting '%s' must be an integer; Value '%s'" % (key, Prefs[key]))
                    error_message += "Setting '%s' must be an integer; Value '%s'<br/>" % (key, Prefs[key])
            elif key.startswith('bool_'):
                if Prefs[key] is not True and Prefs[key] is not False:
                    Log.Error("Setting '%s' must be True or False; Value '%s'" % (key, Prefs[key]))
                    error_message += "Setting '%s' must be True or False; Value '%s'<br/>" % (key, Prefs[key])

            # special cases
            int_greater_than_zero = [
                'int_plexapi_plexapi_timeout',
                'int_plexapi_upload_threads'
            ]
            for test in int_greater_than_zero:
                if key == test and int(Prefs[key]) <= 0:
                    Log.Error("Setting '%s' must be greater than 0; Value '%s'" % (key, Prefs[key]))
                    error_message += "Setting '%s' must be greater than 0; Value '%s'<br/>" % (key, Prefs[key])

    if error_message != '':
        return MessageContainer(header='Error', message=error_message)
    else:
        Log.Info("DefaultPrefs.json is valid")
        return MessageContainer(header='Success', message='Plugger - Provided preference values are ok')


def Start():
    # type: () -> None
    """
    Start the plug-in.

    This function is called when the plug-in first starts. It can be used to perform extra initialisation tasks such as
    configuring the environment and setting default attributes. See the archived Plex documentation
    `Predefined functions
    <https://web.archive.org/web/https://dev.plexapp.com/docs/channels/basics.html#predefined-functions>`_
    for more information.

    First preferences are validated using the ``ValidatePrefs()`` method. Then the flask web app is started.

    Examples
    --------
    >>> Start()
    ...
    """
    # validate prefs
    prefs_valid = ValidatePrefs()
    if prefs_valid.header == 'Error':
        Log.Warn('plug-in preferences are not valid.')

    Log.Debug('plug-in started.')

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


@handler(prefix='/applications/plugger', name='Plugger', thumb='attribution.png')
def main():
    """
    Create the main plug-in ``handler``.

    This is responsible for displaying the plug-in in the plug-ins menu. Since we are using the ``@handler`` decorator,
    and since Plex removed menu's from plug-ins, this method does not need to perform any other function.
    """
    pass
