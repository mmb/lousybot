exports.channelMessage = function (m) {
    var conn = this,
        child;

    if (m.botCommand === 'toilet') {
        child = this.spawn('toilet', ['-f', 'smslant', '--irc'], function (line) {
            if (line.match(/[^\s]/)) {
                conn.privmsg(m.to, line);
            }
        });

        child.stdin.write(m.botCommandArgs);
        child.stdin.end();
    }
};
