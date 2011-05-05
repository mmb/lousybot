function isGreeting(s) {
    return s.match(/^(hi|hello)$/i);
}

exports.channelMessage = function (m) {
    if (isGreeting(m.text)) {
        this.privmsg(m.to, 'hi ' + m.from.nick);
    }
};

exports.privateMessage = function (m) {
    if (isGreeting(m.text)) {
        this.privmsg(m.from.nick, 'hi ' + m.from.nick);
    }
};
