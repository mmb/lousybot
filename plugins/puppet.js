// tell the bot to say something to a user or channel
// !puppet #channel hi
// !puppet nick hi
exports.privateMessage = function (m) {
    if (m.text.match(/^!puppet /)) {
        var args = m.text.substr(8),
            argSep = args.indexOf(' '),
            dest = args.substr(0, argSep),
            text = args.substr(argSep + 1, args.length);

        this.privmsg(dest, text);
    }
};
