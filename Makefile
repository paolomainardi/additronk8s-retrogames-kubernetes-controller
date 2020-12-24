all: run

SHELL := /bin/bash

ifndef GAME_DIR
	GAME_DIR=MONKEY_FLOPPY
endif
ifndef GAME_EXE
	GAME_EXE=MONEY.EXE
endif

build-game-engine:
	docker build -t sparkfabrik/retro-games-k8s:1.0 game-engine

k3d-load-game-engine: build-game-engine
	k3d image import sparkfabrik/retro-games-k8s:1.0 -c retrogames-k8s-dev

run-game-engine: build
	./game-engine/run.sh

run: create-k3d-cluster k3d-load-game-engine
	skaffold run -n games --tail

dev: k3d-load-game-engine
	skaffold dev -n games

create-k3d-cluster:
	k3d cluster delete retrogames-k8s-dev || true
	k3d cluster create retrogames-k8s-dev

