#!/bin/sh

daemon -D ${PWD} -o ${PWD}/lousybot.log -r node lousybot.js
