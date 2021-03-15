var http = require('http');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`<h1>Node Instance : ${process.env.HOSTNAME}</h1>`);
}).listen(8080);