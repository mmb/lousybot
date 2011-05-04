var net = require('net');

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
    }

    console.log(parsed);

    return parsed;
}

var conn = net.createConnection(6668, host='127.0.0.1');
conn.messageSoFar = '';

conn.sendMessage = function(command, text) {
    var formatted = formatIrcMessage(command, text);

    console.log('send ' + formatted);
    this.write(formatted);
};

conn.addListener('connect', function() {
    var nick = 'lousybot';

    this.sendMessage('PASS', '*');
    this.sendMessage('NICK', nick);
    this.sendMessage('USER', nick + ' * * ' + nick);
});

conn.addListener('data', function(buffer) {
    console.log('receive ' + buffer.toString());
    this.messageSoFar += buffer.toString();

    if (this.messageSoFar.match(/\r\n$/)) {
	var message = parseIrcMessage(this.messageSoFar.slice(0));
        this.emit(message.command, message);
        this.messageSoFar = '';
    }
});

// IRC command listeners

// welcome
conn.addListener('001', function() {
    this.sendMessage('JOIN', '#test');
});

conn.addListener('PING', function(message) {
    this.sendMessage('PONG', message.params[0]);
});

conn.addListener('PRIVMSG', function(message) {
    var channel = message.params[0],
    text = message.params.slice(1).join(' ');

    this.sendMessage('PRIVMSG', channel + ' ' + text);
});
