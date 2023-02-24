### lizardbyte/plugger

This is a [docker-mod](https://linuxserver.github.io/docker-mods/) for
[plex](https://hub.docker.com/r/linuxserver/plex) which adds
[Plugger](https://github.com/LizardByte/Plugger) to plex as a plugin,
to be downloaded/updated during container start.

This image extends the plex image, and is not intended to be created as a separate container.

### Installation

In plex docker arguments, set an environment variable `DOCKER_MODS=lizardbyte/plugger:latest` or
`DOCKER_MODS=ghcr.io/lizardbyte/plugger:latest`

If adding multiple mods, enter them in an array separated by `|`, such as
`DOCKER_MODS=lizardbyte/plugger:latest|linuxserver/mods:other-plex-mod`

### Supported Architectures

Specifying `lizardbyte/plugger:latest` or `ghcr.io/lizardbyte/plugger:latest`
should retrieve the correct image for your architecture.

The architectures supported by this image are:

| Architecture | Available |
|:------------:|:---------:|
|    x86-64    |     ✅     |
|    arm64     |     ✅     |
|    armhf     |     ✅     |
