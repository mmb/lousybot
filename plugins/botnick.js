// change the bot's nick: !botnick newnick

function botnick(m) {
    if (m.text.match(/^!botnick /)) {
        var newNick = m.text.substr(9);

        this.sendMessage('NICK', newNick);
        this.botNick = newNick;
    }
}

exports.channelMessage = botnick;
exports.privateMessage = botnick;
