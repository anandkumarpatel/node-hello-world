var http = require('http');
var port = process.env.PORT || 52738;
http.createServer(function (req, res) {
  console.log(req.headers);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello DJ FaZe\n');
}).listen(port);
console.log('Server running at http://127.0.0.1:'+port);
