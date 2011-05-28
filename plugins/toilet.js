exports.channelMessage = function (m) {
    if ((m.botCommand === 'toilet') && (m.botCommandArgs !== undefined)) {
        var conn = this,
            child;

        child = this.spawn('toilet', ['-f', 'smslant', '--irc'], function (line) {
            if (line.match(/[^\s]/)) {
                conn.privmsg(m.to, line);
            }
        });

        child.stdin.write(m.botCommandArgs);
        child.stdin.end();
    }
};
