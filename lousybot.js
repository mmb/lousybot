var serverHost = '127.0.0.1',
    serverPort = 6668,
    serverPass = '*',
    botNick = 'lousybot',
    joinChannels = [ '#test' ],
    pluginDir = './plugins',

    IRC_MESSAGE_END = '\r\n',

    fs = require('fs'),
    net = require('net'),
    spawn = require('child_process').spawn;

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
        };

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

var conn = net.createConnection(serverPort, host=serverHost);
conn.messageBuffer = '';

conn.sendMessage = function (command, text) {
    var formatted = formatIrcMessage(command, text);

    console.log('send ' + formatted);
    this.write(formatted);
};

conn.privmsg = function (to, message) {
    this.sendMessage('PRIVMSG', to + ' :' + message);
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
            if (!(message === '')) {
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
        lastLine,
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
    m.to = m.params[0];
    m.text = m.params.slice(1).join(' ').substr(1);

    var hostmaskMatch = m.prefix.match(/(.+)!(.+)@(.+)/);

    if (hostmaskMatch) {
        m.from = {
            nick : hostmaskMatch[1],
            user : hostmaskMatch[2],
            host : hostmaskMatch[3]
        };
    }

    if (m.to.match(/^#/)) {
        m.channel = m.to;
        this.emit('channelMessage', m);
    } else {
        this.emit('privateMessage', m);
    }
});

loadPlugins(pluginDir);
