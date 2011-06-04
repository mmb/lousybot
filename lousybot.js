var serverHost = '127.0.0.1',
    serverPort = 6668,
    serverPass = '*',
    botNick = 'lousybot',
    joinChannels = [ '#test' ],
    pluginDir = './plugins',
    commandPrefix = '!',
    enableHttp = true,
    httpPort = 31337,
    httpHost = 'localhost',

    IRC_MESSAGE_END = '\r\n',
    IRC_MAX_MESSAGE = 510,

    fs = require('fs'),
    http = require('http'),
    net = require('net'),
    queryString = require('querystring'),
    spawn = require('child_process').spawn,
    url = require('url');

function formatIrcMessage(command, text) {
    return command + ' ' + text + IRC_MESSAGE_END;
}

function parseIrcMessage(s) {
    console.log('parse ' + s);

    var match = s.match(/(?::(.+?) )?(.+?) (.*)/),
        parsed = {
            prefix  : match[1],
            command : match[2],
            params  : match[3].split(' ')
        },
        hostmaskMatch;
      
    if (parsed.prefix !== undefined) {
        hostmaskMatch = parsed.prefix.match(/(.+)!(.+)@(.+)/);

        if (hostmaskMatch) {
            parsed.from = {
                nick : hostmaskMatch[1],
                user : hostmaskMatch[2],
                host : hostmaskMatch[3]
            };
        }
    }

    console.log(parsed);

    return parsed;
}

function loadPlugins(path) {
    var exp,
        plugin,
        pluginPath;

    fs.readdirSync(path).forEach(function (file) {
        if (file.match(/\.js$/)) {
            pluginPath = path + '/' + file;
            console.log('require ' + pluginPath);
            plugin = require(pluginPath);

            for (exp in plugin) {
                conn.addListener(exp, plugin[exp]);
            }
        }
    });
}

function parseBotCommand(s) {
    var argSep,
        command,
        result = {
            botCommand : '',
            botCommandArgs : ''
        };

    if (s.substr(0, commandPrefix.length) === commandPrefix) {
        command = s.substr(commandPrefix.length);
        argSep = command.indexOf(' ');
        if (argSep !== -1) {
            result.botCommand = command.substr(0, argSep);
            result.botCommandArgs = command.substr(argSep + 1, command.length);
        } else {
            result.botCommand = command;
        }
    }

    return result;
}

var conn = net.createConnection(serverPort, host=serverHost);
conn.botNick = botNick;
conn.messageBuffer = '';

conn.sendMessage = function (command, text) {
    var formatted = formatIrcMessage(command, text);

    console.log('send ' + formatted);
    this.write(formatted);
};

conn.privmsg = function (to, message) {
    var prefixLen = ('PRIVMSG ' + to + ' :').length,
        partLen = IRC_MAX_MESSAGE - prefixLen,
        numParts = Math.floor(message.length / partLen),
        i;
    if (message.length % partLen !== 0) {
        numParts += 1;
    }

    for (i = 0; i < numParts; i++) {
        this.sendMessage('PRIVMSG',
            to + ' :' + message.slice(i * partLen, i * partLen + partLen));
    }
};

conn.addListener('connect', function () {
    this.sendMessage('PASS', serverPass);
    this.sendMessage('NICK', botNick);
    this.sendMessage('USER', botNick + ' * * ' + botNick);
});

conn.addListener('data', function (buffer) {
    var connection;

    console.log('receive ' + buffer.toString());
    this.messageBuffer += buffer.toString();

    if (this.messageBuffer.match(new RegExp(IRC_MESSAGE_END + '$'))) {
        connection = this;
        this.messageBuffer.split(IRC_MESSAGE_END).forEach(function (message) {
            var parsedMessage;
            if (message !== '') {
                parsedMessage = parseIrcMessage(message);
                connection.emit(parsedMessage.command, parsedMessage);
            }
        });
        this.messageBuffer = '';
    }
});

// spawn a child process and call lineCallback for each line of its stdout
conn.spawn = function (command, args, lineCallback) {
    var child = spawn(command, args),
        buffer = '',
        lines;

    child.stdout.on('data', function (data) {
        lines = (buffer + data).split('\n');
        buffer = lines.pop();
        lines.forEach(lineCallback);
    });

    return child;
};

// IRC command listeners

// welcome
conn.addListener('001', function () {
    var connection = this;

    joinChannels.forEach(function (channel) {
        connection.sendMessage('JOIN', channel);
    });
});

conn.addListener('PING', function (m) {
    this.sendMessage('PONG', m.params[0]);
});

conn.addListener('PRIVMSG', function (m) {
    var botCommand,
        x;

    m.to = m.params[0];
    m.text = m.params.slice(1).join(' ').substr(1);

    botCommand = parseBotCommand(m.text);
    for (x in botCommand) {
        m[x] = botCommand[x];
    }

    if (m.to.match(/^#/)) {
        m.channel = m.to;
        this.emit('channelMessage', m);
    } else {
        this.emit('privateMessage', m);
    }
});

loadPlugins(pluginDir);

if (enableHttp) {
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
    }).listen(httpPort, httpHost);
}
