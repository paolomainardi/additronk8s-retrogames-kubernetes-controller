docker rm -f retrogames-k8s || true
docker run \
  --detach \
  --env DISPLAY_SETTINGS="1024x768x24" \
  --env GAME_DIR=${1} \
  --env GAME_EXE="${2}" \
  --env DOSBOX_CLI="n" \
  --publish 8080:8080 \
  --publish 8081:8081 \
  --rm \
  -v $PWD/games:/games \
  --name retrogames-k8s \
  sparkfabrik/retro-games-k8s:1.0
  xdg-open http://localhost:8080
