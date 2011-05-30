// tell the bot to say something to a user or channel
// !puppet #channel hi
// !puppet nick hi
exports.privateMessage = function (m) {
    var argSep,
        dest,
        test;

    if ((m.botCommand === 'puppet') && (m.botCommandArgs.match(/[^\s]/))) {
        argSep = m.botCommandArgs.indexOf(' ');
        dest = m.botCommandArgs.substr(0, argSep);
        text = m.botCommandArgs.substr(argSep + 1, m.botCommandArgs.length);

        this.privmsg(dest, text);
    }
};
