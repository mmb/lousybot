function isGreeting(s, botNick) {
    return s.match(new RegExp('^' +
        '(' + botNick + '\\s*:\\s*)?' +
        '(hi|hello)' + '(\\s+' + botNick + ')?' +
        '\\s*$', 'i'));
}

exports.channelMessage = function (m) {
    if (isGreeting(m.text, this.botNick)) {
        this.privmsg(m.to, 'hi ' + m.from.nick);
    }
};

exports.privateMessage = function (m) {
    if (isGreeting(m.text, this.botNick)) {
        this.privmsg(m.from.nick, 'hi ' + m.from.nick);
    }
};
