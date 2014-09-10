#!/bin/bash
cd /runnable/node-hello-world
T="$(date +%s%N)"
sudo docker build --no-cache . >> /runnable/node-hello-world/logs 2>&1
E=$?
T="$(($(date +%s%N)-T))"
M="$((T/1000000))"
echo "TIME_IN_MS " $M " " $E >> data

