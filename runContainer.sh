#!/bin/bash
# ./runContainer.sh <time log>
T="$(date +%s%N)"
sudo docker build --no-cache . >> /dev/null 2>&1
E=$?
T="$(($(date +%s%N)-T))"
M="$((T/1000000))"
echo "BUILD_TIME_MS " $M " EXIT_CODE " $E >> $1