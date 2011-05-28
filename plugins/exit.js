function exit(m) {
    if (m.botCommand === 'exit') {
        process.exit(0);
    }
}

exports.channelMessage = exit;
exports.privateMessage = exit;
