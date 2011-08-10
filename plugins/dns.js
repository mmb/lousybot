// when hostnames or ip addresses are seen in channels or private messages
// lookup dns information about them

var dns = require('dns'),
    hostnameRe = /([a-z\d]([a-z\d\-]{0,61}[a-z\d])?\.)+[a-z]+/gi,
    ipRe = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

function formatA(recs) {
    return 'A:' + recs.join(', ');
}

function formatCnames(cnames) {
    cnames.sort();

    return 'CNAME: ' + cnames.join(', ');
}

function formatMx(mx) {
    var result = [];

    mx.forEach(function (rec) {
        result.push(rec.exchange);
    });

    result.sort();

    return 'MX:' + result.join(', ');
}

function formatNs(nameservers) {
    nameservers.sort();

    return 'NS:' + nameservers.join(', ');
}

function formatReverse(ip, hostnames) {
    hostnames.sort();

    return ip + '->[' + hostnames.join(', ') + ']';
}

function infoHostnames(s, callback) {
    (s.match(hostnameRe) || []).forEach(function (hostname) {
        var doneCount = 0,
            results = [],
            numParts = 4;

        dns.resolve4(hostname, function (err, ips) {
            var ipsDoneCount = 0,
                ipResults = [];

            if (err) {
                console.log(err);
            } else {
                ips.forEach(function (ip) {
                    dns.reverse(ip, function (err, hostnames) {
                        ipsDoneCount += 1;

                        if (err) {
                            console.log(err);
                            ipResults.push(ip);
                        } else {
                            if (hostnames.length > 0) {
                                ipResults.push(formatReverse(ip, hostnames));
                            } else {
                                ipResults.push(ip);
                            }
                        }
                        if (ipsDoneCount === ips.length) {
                            results.push(formatA(ipResults));
                            doneCount += 1;
                            if (doneCount === numParts) {
                                callback(hostname + ' ' + results.join(' ; '));
                            }
                        }
                    });
                });
            }
        });

        dns.resolveCname(hostname, function (err, cnames) {
            doneCount += 1;
            if (err) {
                console.log(err);
            } else {
                if (cnames.length > 0) {
                    results.push(formatCnames(cnames));
                }
            }
            if (doneCount === numParts) {
                callback(hostname + ' ' + results.join(' ; '));
            }
        });

        dns.resolveMx(hostname, function (err, mx) {
            doneCount += 1;
            if (err) {
                console.log(err);
            } else {
                if (mx.length > 0) {
                    results.push(formatMx(mx));
                }
            }
            if (doneCount === numParts) {
                callback(hostname + ' ' + results.join(' ; '));
            }
        });

        dns.resolveNs(hostname, function (err, ns) {
            doneCount += 1;
            if (err) {
                console.log(err);
            } else {
                if (ns.length > 0) {
                    results.push(formatNs(ns));
                }
            }
            if (doneCount === numParts) {
                callback(hostname + ' ' + results.join(' ; '));
            }
        });
    });
}

function infoIps(s, callback) {
    (s.match(ipRe) || []).forEach(function (ip) {
        dns.reverse(ip, function (err, hostnames) {
            if (err) {
                console.log(err);
            } else {
                if (hostnames.length > 0) {
                    callback(formatReverse(ip, hostnames));
                }
            }
        });
    });
}

exports.privateMessage = function (m) {
    var conn = this;

    infoHostnames(m.text, function (resp) {
        conn.privmsg(m.from.nick, resp);
    });

    infoIps(m.text, function (resp) {
        conn.privmsg(m.from.nick, resp);
    });
};

exports.channelMessage = function (m) {
    var conn = this;

    infoHostnames(m.text, function (resp) {
        conn.privmsg(m.to, resp);
    });

    infoIps(m.text, function (resp) {
        conn.privmsg(m.to, resp);
    });
};
