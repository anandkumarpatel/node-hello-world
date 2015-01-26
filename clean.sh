#!/bin/bash
service docker stop
umount -l /docker
mkfs -t ext4 /dev/xvdb
mount -a
service docker start
until docker pull ubuntu; do
  sleep 1
done

