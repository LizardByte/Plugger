# standard imports
import os

# plex debugging
try:
    import plexhints  # noqa: F401
except ImportError:
    pass
else:  # the code is running outside of Plex
    from plexhints.core_kit import Core  # core kit

bundle_identifier = 'dev.lizardbyte.plugger'
app_support_directory = Core.app_support_path
plugin_logs_directory = os.path.join(app_support_directory, 'Logs', 'PMS Plugin Logs')
