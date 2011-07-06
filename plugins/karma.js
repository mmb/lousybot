// track karma
// 
// karma is changed when someone says something++ or something--
//
// diminishing returns for the same nick repeatedly changing the same topic
// within a 24-hour period

var incRe = /(.+)\+\+$/,
    decRe = /(.+)--$/;

function currentUnixTime() {
    return parseInt(new Date().getTime() / 1000);
}

function formatUnixTime(t) {
    return new Date(t * 1000);
}

function encodeKey(key) {
    return 'karma.' + encodeURIComponent(key);
}

function getKarma(db, topic, foundCallback, notFoundCallback) {
    db.get(encodeKey(topic), function (err, doc) {
        if (err) {
            if (err.error === 'not_found') {
                notFoundCallback(err);
            } else {
                console.log(err);
            }
        } else {
            foundCallback(doc);
        }
    });
}

// return how many times a user has changed the karma for a doc in the last 24
// hours
function numRecentChanges(who, doc) {
    var count = 0,
        e,
        i,
        now = currentUnixTime();

    for (i = 0; i < doc.history.length; i++) {
        e = doc.history[i];
        if (e[2] > (now - 86400)) {
            if (e[0] === who) {
                count += 1;
            } else {
                break;
            }
        }
    }

    return count;
}

function changeKarma(db, topic, change, who, callback) {
    var key = encodeKey(topic);

    getKarma(db, topic,
        function (doc) {
            var actualChange = change / Math.pow(2, numRecentChanges(who, doc));
            doc.history.unshift([who, actualChange, currentUnixTime()]);
            doc.score += actualChange;

            db.save(key, doc);
            callback(doc);
        },
        function() {
            var newDoc = {
                history : [[who, change, currentUnixTime()]],
                score : change
            };

            db.save(key, newDoc);
            callback(newDoc);
        }
    );
}

exports.channelMessage = function (m) {
    var conn = this,
        decMatch,
        incMatch;

    if (conn.db !== undefined) {
        decMatch = m.text.match(decRe);
        incMatch = m.text.match(incRe);

        if (incMatch) {
            changeKarma(conn.db, incMatch[1], 1, m.from.nick, function(doc) {
                conn.privmsg(m.to, 'Karma for ' + incMatch[1] + ' is now ' +
                    doc.score.toFixed(3));
            });
        } else if (decMatch) {
            changeKarma(conn.db, decMatch[1], -1, m.from.nick, function(doc) {
                conn.privmsg(m.to, 'Karma for ' + decMatch[1] + ' is now ' +
                    doc.score.toFixed(3));
            });
        } else if (m.botCommand == 'karma' &&
            m.botCommandArgs.match(/[^\s]/)) {
            getKarma(conn.db, m.botCommandArgs,
                function (doc) {
                    var lastChange = doc.history[0];
                    conn.privmsg(m.to, 'Karma for ' + m.botCommandArgs +
                        ' is ' + doc.score.toFixed(3) + ', last changed by ' +
                        lastChange[0] + ' by ' + lastChange[1] + ' at ' +
                        formatUnixTime(lastChange[2]));
                },
                function () {
                    conn.privmsg(m.to, m.botCommandArgs + ' has no karma');
                }
            );
        }
    }
};
