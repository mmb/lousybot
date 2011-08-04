var serverHost = '127.0.0.1',
    serverPort = 6668,
    serverPass = '*',
    botNick = 'lousybot',
    joinChannels = [ '#test' ],
    pluginDir = './plugins',
    commandPrefix = '!',

    IRC_MESSAGE_END = '\r\n',
    IRC_MAX_MESSAGE = 417,

    fs = require('fs'),
    net = require('net'),
    spawn = require('child_process').spawn,

    couchDbHost = '127.0.0.1',
    couchDbPort = 5984,
    cradle,
    dbConnection,
    db;

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

// divide a string into parts, each a maximum of partSize length
function partString(s, partSize) {
    var numParts = Math.floor(s.length / partSize),
        i,
        start,
        result = [];

    if (s.length % partSize !== 0) {
        numParts += 1;
    }

    for (i = 0; i < numParts; i++) {
        start = i * partSize;
        result.push(s.slice(start, start + partSize));
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
        partSize = IRC_MAX_MESSAGE - prefixLen,
        messageParts,
        i,
        messagePart;

    messageParts = partString(message, partSize);
    for (i = 0; i < messageParts.length; i++) {
        this.sendMessage('PRIVMSG', to + ' :' + messageParts[i]);
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

    connection.emit('joinsSent');
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

if (couchDbHost && couchDbPort) {
    cradle = require('cradle');
    dbConnection = new cradle.Connection(couchDbHost, couchDbPort);
    conn.db = dbConnection.database('lousybot');
    conn.db.exists(function (err, exists) {
        if (err) {
            throw err;
        } else {
            console.log('connected to couchdb ' + couchDbHost + ':' +
                couchDbPort);
            if (!exists) {
                conn.db.create();
                console.log('database created');
            }
        }
    });
}

loadPlugins(pluginDir);
