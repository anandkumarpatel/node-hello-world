#!/bin/bash
# ./runContainer.sh <time log>
T="$(date +%s%N)"
docker build --no-cache . >> /dev/null 2>&1
E=$?
T="$(($(date +%s%N)-T))"
M="$((T/1000000))"
# csv format BUILD_TIME_MS, EXIT_CODE
echo  "$M,$E,," >> $1
