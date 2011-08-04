// make lousybot listen on a host and port for http requests that can be
// used to send messages to users or channels from scripts

// to send a message http GET http://host:port/?to=nick&message=hi
// example: curl http://localhost:8078/?to=%23test\&message=hi

var http = require('http'),
    queryString = require('querystring'),
    url = require('url'),

    host = 'localhost',
    port = 8078;

exports.joinsSent = function () {
    var conn = this;

    http.createServer(function (req, resp) {
        var query,
            urlParsed;

        urlParsed = url.parse(req.url);

        console.log(req.method + ' ' + urlParsed.href);

        query = queryString.parse(urlParsed.query);

        if (query.to && query.message) {
            conn.privmsg(query.to, query.message);
        }

        resp.writeHead(200, {  'Content-Type' : 'text/html' });
        resp.end(conn.botNick + ' <form method="get" action=""><input type="text" name="to" /><input type="text" name="message" /><input type="submit" /></form>');
    }).listen(port, host);
};
