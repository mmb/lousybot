exports.channelMessage = function (m) {
    if (m.text.match(/^!toilet /)) {
        var conn = this,
        child;

        child = this.spawn('toilet', ['-f', 'smslant', '--irc'], function (line) {
            if (line.match(/[^\s]/)) {
                conn.privmsg(m.to, line);
            }
        });

        child.stdin.write(m.text.substr(8));
        child.stdin.end();
    }
};
