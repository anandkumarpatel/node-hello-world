#!/bin/bash
service docker stop
rm -rf /var/lib/docker
service docker start
docker pull ubuntu