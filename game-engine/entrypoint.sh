#!/bin/bash
set -e
export DOSCONF=$(dosbox -printconf)
export GAME_ROOT=${GAME_ROOT:-/games}
export DOSBOX_CLI=${DOSBOX_CLI:-n}
sleep 5

if [ -z ${GAME_DIR} ]
then
    echo "You should pass the game directory you want to run, eg: \"GAME_DIR=DOOM\" exiting..."
    exit 255
fi

if [ -z ${GAME_EXE} ]
then
    echo "You should pass the game executable you want to run, eg: \"GAME_EXE=DOOM\" exiting..."
    exit 255
fi

if [ ${DOSBOX_CLI} == 'n' ]; then
    if [ ! -f ${GAME_ROOT}/${GAME_DIR}/${GAME_EXE} ]
    then
        echo "I cannot find the executable: ${GAME_ROOT}/${GAME_DIR}/${GAME_EXE}"
        exit 255
    fi
    envsubst < /dosbox/dosbox.conf.template > ~/.dosbox/dosbox.conf
    exec dosbox -conf ~/.dosbox/dosbox.conf
else
    envsubst < /dosbox/dosbox.cli.conf.template > ~/.dosbox/dosbox.conf
    exec dosbox -conf ~/.dosbox/dosbox.conf
fi


