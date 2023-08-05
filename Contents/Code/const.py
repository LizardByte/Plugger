# standard imports
import os

# plex debugging
try:
    import plexhints  # noqa: F401
except ImportError:
    pass
else:  # the code is running outside of Plex
    from plexhints.core_kit import Core  # core kit

# plex constants
app_support_directory = Core.app_support_path
plex_base_url = 'http://127.0.0.1:32400'
plex_token = os.environ.get('PLEXTOKEN')
plugin_directory = os.path.join(app_support_directory, 'Plug-ins')
plugin_logs_directory = os.path.join(app_support_directory, 'Logs', 'PMS Plugin Logs')
plugin_support_directory = os.path.join(app_support_directory, 'Plug-in Support')
plugin_support_caches_directory = os.path.join(plugin_support_directory, 'Caches')
plugin_support_data_directory = os.path.join(plugin_support_directory, 'Data')
plugin_support_databases_directory = os.path.join(plugin_support_directory, 'Databases')
plugin_support_metadata_combination_directory = os.path.join(plugin_support_directory, 'Metadata Combination')
plugin_support_preferences_directory = os.path.join(plugin_support_directory, 'Preferences')
system_plugins_directory = Core.bundled_plugins_path

# plugger constants
bundle_identifier = 'dev.lizardbyte.plugger'
plugger_data_directory = os.path.join(plugin_support_data_directory, bundle_identifier)
