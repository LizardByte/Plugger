# plex debugging
try:
    import plexhints  # noqa: F401
except ImportError:
    pass
else:  # the code is running outside of Plex
    from plexhints.log_kit import Log  # log kit

# local imports
from const import plugger_data_directory, plugin_directory

# servers version newer than 1.13 cannot view plugin routes, maybe we can do something with this later
# https://www.reddit.com/r/PleX/comments/ig64mz/comment/jhk5jbu/?utm_source=share&utm_medium=web2x&context=3


def initialize_install(plugin_data):
    # type: (dict) -> bool
    """
    Initialize the plugin installation process.

    Parses the plugin data for further processing depending on the conditions.

    .. todo:: Complete this function.

    Parameters
    ----------
    plugin_data : dict
        The plugin data to process.

    Returns
    -------
    bool
        Whether the plugin was successfully installed/migrated/updated.
    """
    Log.Debug("{}: {}".format("plugger_support_directory", plugger_data_directory))
    Log.Debug("{}: {}".format("plugin_directory", plugin_directory))

    Log.Debug('Initializing plugin installation process for "{}"'.format(plugin_data['plugin']['full_name']))
    for k, v in plugin_data.items():
        Log.Debug("{}: {}".format(k, v))
    return True


def uninstall_plugin(plugin_name):
    # type: (str) -> bool
    """
    Uninstall a plugin.

    Parameters
    ----------
    plugin_name : str
        The name of the plugin to uninstall.

    Returns
    -------
    bool
        Whether or not the plugin was successfully uninstalled.
    """
    Log.Debug("Uninstalling plugin: {}".format(plugin_name))
    return True
