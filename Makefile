all: run

SHELL := /bin/bash

ifndef GAME_DIR
	GAME_DIR=MONKEY_FLOPPY
endif
ifndef GAME_EXE
	GAME_EXE=MONEY.EXE
endif

build-game-engine:
	docker build -t ghcr.io/paolomainardi/additronk8s-game-engine:latest game-engine

kind-load-game-engine: build-game-engine
	kind load docker-image ghcr.io/paolomainardi/additronk8s-game-engine:latest --name retrogames-k8s-dev

run-game-engine: build
	./game-engine/run.sh

run: create-kind-cluster kind-load-game-engine
	skaffold run -n games --tail

dev: kind-load-game-engine
	skaffold dev -n games --tail

create-kind-cluster:
	kind delete cluster --name retrogames-k8s-dev || true
	kind create cluster --name retrogames-k8s-dev

