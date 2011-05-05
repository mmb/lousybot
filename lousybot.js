var serverHost = '127.0.0.1',
serverPort = 6668,
serverPass = 'snails68Ibo',
botNick = 'lousybot',
joinChannels = [ '#test' ],
pluginDir = './plugins';

fs = require('fs');
net = require('net');

function formatIrcMessage(command, text) {
    return command + ' ' + text + '\r\n';
}

function parseIrcMessage(s) {
    console.log('parse ' + s);

    var match = s.match(/(?::(.+?) )?(.+?) (.*)\r\n/);

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

    fs.readdirSync(path).forEach(function(file) {
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
conn.messageSoFar = '';

conn.sendMessage = function(command, text) {
    var formatted = formatIrcMessage(command, text);

    console.log('send ' + formatted);
    this.write(formatted);
};

conn.privmsg = function(to, message) {
    this.sendMessage('PRIVMSG', to + ' :' + message);
};

conn.addListener('connect', function() {
    this.sendMessage('PASS', serverPass);
    this.sendMessage('NICK', botNick);
    this.sendMessage('USER', botNick + ' * * ' + botNick);
});

conn.addListener('data', function(buffer) {
    var message;

    console.log('receive ' + buffer.toString());
    this.messageSoFar += buffer.toString();

    if (this.messageSoFar.match(/\r\n$/)) {
	message = parseIrcMessage(this.messageSoFar.slice(0));
        this.emit(message.command, message);
        this.messageSoFar = '';
    }
});

// IRC command listeners

// welcome
conn.addListener('001', function() {
    var connection = this;

    joinChannels.forEach(function(channel) {
	connection.sendMessage('JOIN', channel);
    });
});

conn.addListener('PING', function(m) {
    this.sendMessage('PONG', m.params[0]);
});

conn.addListener('PRIVMSG', function(m) {
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
