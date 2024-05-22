### lizardbyte/plugger

This is a [docker-mod](https://linuxserver.github.io/docker-mods/) for
[plex](https://hub.docker.com/r/linuxserver/plex) that adds
[Plugger](https://github.com/LizardByte/Plugger) to plex as a plugin,
to be downloaded/updated during container start.

This image extends the plex image, and is not intended to be created as a separate container.

### Installation

In plex docker arguments, set an environment variable `DOCKER_MODS=lizardbyte/plugger:latest` or
`DOCKER_MODS=ghcr.io/lizardbyte/plugger:latest`

If adding multiple mods, enter them in an array separated by `|`, such as
`DOCKER_MODS=lizardbyte/plugger:latest|linuxserver/mods:other-plex-mod`

### Supported Architectures

Linuxserver.io docker mods do not support multi-arch images; however this image should run on any architecture. If
you have issues with this image on a specific architecture, please open an issue on GitHub.
