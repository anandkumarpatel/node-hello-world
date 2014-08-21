FROM dockerfile/nodejs
ADD . /app
WORKDIR /app
EXPOSE 80
CMD node server.js