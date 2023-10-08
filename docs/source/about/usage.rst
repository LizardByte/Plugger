:github_url: https://github.com/LizardByte/Plugger/tree/nightly/docs/source/about/usage.rst

Usage
=====

Minimal setup is required to use Plugger. In addition to the installation, a couple of settings must be configured.

   #. Navigate to the `Plugins` menu within the Plex server settings.
   #. Select the gear cog when hovering over the Plugger plugin tile.
   #. Set the values of the preferences and save.

Preferences
-----------

Web UI Locale
^^^^^^^^^^^^^

Description
   The localization value to use for translations.

Default
   ``en``

Web UI Host Address
^^^^^^^^^^^^^^^^^^^

Description
   The host address to bind the Web UI to.

Default
   ``0.0.0.0``

Web UI Port
^^^^^^^^^^^

Description
   The port to bind the Web UI to.

Default
   ``9595``

Log all web server messages
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Description
   If set to ``True``, all web server messages will be logged. This will include logging requests and status codes when
   requesting any resource. It is recommended to keep this disabled unless debugging.

Default
   ``False``
