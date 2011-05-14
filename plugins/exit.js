function exit(m) {
    if (m.text === '!exit') {
        process.exit(0);
    }
}

exports.channelMessage = exit;
exports.privateMessage = exit;
