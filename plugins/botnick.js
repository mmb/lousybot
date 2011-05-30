// change the bot's nick: !botnick newnick

function botnick(m) {
    if ((m.botCommand === 'botnick') && (m.botCommandArgs.match(/[^\s]/))) {
        this.sendMessage('NICK', m.botCommandArgs);
        this.botNick = m.botCommandArgs;
    }
}

exports.channelMessage = botnick;
exports.privateMessage = botnick;
