FROM debian:10.7

ENV LANG=en_US.UTF-8 LANGUAGE=en_US.UTF-8 LC_ALL=C.UTF-8 DISPLAY=:0.0

# Install dependencies.
RUN apt-get update \
     && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
     bzip2 \
     gstreamer1.0-plugins-good \
     gstreamer1.0-pulseaudio \
     gstreamer1.0-tools \
     libglu1-mesa \
     libgtk2.0-0 \
     libncursesw5 \
     libopenal1 \
     libsdl-image1.2 \
     libsdl-ttf2.0-0 \
     libsdl1.2debian \
     libsndfile1 \
     novnc \
     pulseaudio \
     supervisor \
     ucspi-tcp \
     wget \
     x11vnc \
     xvfb \
     dosbox \
     procps \
     gettext-base \
     unzip \
     patch \
     && rm -rf /var/lib/apt/lists/*

# Configure pulseaudio.
COPY conf/default.pa conf/client.conf /etc/pulse/

# Force vnc_lite.html to be used for novnc, to avoid having the directory listing page.
# Additionally, turn off the control bar. Finally, add a hook to start audio.
COPY conf/webaudio.js /usr/share/novnc/core/
COPY conf/novnc/vnc_lite.html /usr/share/novnc/vnc_lite.html
RUN ln -s /usr/share/novnc/vnc_lite.html /usr/share/novnc/index.html

# Add a patch to make the background customizable.
COPY conf/novnc/background_patch.diff /usr/share/novnc
RUN  cd /usr/share/novnc && \
     patch -p1 < background_patch.diff

# Configure supervisord.
COPY conf/supervisord.conf /etc/supervisor/supervisord.conf

# Run everything as standard user/group retrogames.
RUN groupadd retrogames \
     && useradd --create-home --gid retrogames retrogames
WORKDIR /home/retrogames

# Copy dosbox custom confs.
COPY conf/dosbox /dosbox/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy games.
RUN mkdir /games && chown -R retrogames:retrogames /games
USER retrogames
#COPY --chown=retrogames:retrogames games /games

HEALTHCHECK CMD ps aux | grep dosbox | grep -v grep || exit 1
ENTRYPOINT [ "supervisord", "-c", "/etc/supervisor/supervisord.conf" ]