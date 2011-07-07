// store and recall key/value pairs in CouchDB
//
// To store, tell bot in channel or private message: !k=v
// To retrieve: k?

var lookupRe = /!?\s*(.+?)\s*\?+\s*$/,
    storeRe = /!\s*(.+?)\s*=\s*(.+)\s*/;

function encodeKey(key) {
    return 'remember.' + encodeURIComponent(key);
}

function parseMessage(m, db, storedCallback, foundCallback) {
    var lookupMatch = m.text.match(lookupRe),
        storeMatch = m.text.match(storeRe);

    if (lookupMatch) {
        db.get(encodeKey(lookupMatch[1]),
            function (err, doc) {
                if (err) {
                    console.log(err);
                } else {
                    storedCallback(lookupMatch[1] + " is " + doc.def);
                }
            });
    }
    if (storeMatch) {
        db.save(encodeKey(storeMatch[1]), {
            def: storeMatch[2],
            from: m.from,
            time: new Date(),
            to: m.to
        });
        foundCallback("I will remember that '" + storeMatch[1] + "' is '" +
            storeMatch[2] + "'");
    }
}

exports.privateMessage = function (m) {
    var conn = this;
    if (this.db !== undefined) {
        parseMessage(m, this.db,
            function (s) {
                conn.privmsg(m.from.nick, s);
            },
            function (s) {
                conn.privmsg(m.from.nick, s);
            }
        );
    }
};

exports.channelMessage = function (m) {
    var conn = this;
    if (this.db !== undefined) {
        parseMessage(m, this.db,
            function (s) {
                conn.privmsg(m.to, s);
            },
            function (s) {
                conn.privmsg(m.to, s);
            }
        );
    }
};
