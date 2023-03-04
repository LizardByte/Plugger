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
plugin_directory = os.path.join(app_support_directory, 'Plug-ins')
plugin_logs_directory = os.path.join(app_support_directory, 'Logs', 'PMS Plugin Logs')
system_plugins_directory = Core.bundled_plugins_path
plex_base_url = 'http://127.0.0.1:32400'
plex_token = os.environ.get('PLEXTOKEN')
