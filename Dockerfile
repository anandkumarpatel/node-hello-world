FROM dockerfile/nodejs
ADD . /app
WORKDIR /app
EXPOSE 52738
CMD node server.js
