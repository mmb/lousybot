// when hostnames or ip addresses are seen in channels or private messages
// lookup dns information about them

var dns = require('dns'),
    hostnameRe = /([a-z\d_]([a-z\d\-]{0,61}[a-z\d])?\.)+[a-z]+/gi,
    ipRe = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g;

function cmp(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
}

function formatA(recs) {
    return 'A:' + recs.join(', ');
}

function formatCnames(cnames) {
    cnames.sort();

    return 'CNAME: ' + cnames.join(', ');
}

function formatMx(mx) {
    var result = [];

    mx.sort(function (a, b) {
        var result = cmp(a.priority, b.priority);
        if (result === 0) {
            result = cmp(a.exchange, b.exchange);
        }

        return result;
    });
    mx.slice(0, 3).forEach(function (rec) {
        result.push(rec.exchange);
    });

    return 'MX:' + result.join(', ');
}

function formatNs(nameservers) {
    nameservers.sort();

    return 'NS:' + nameservers.slice(0, 3).join(', ');
}

function formatReverse(ip, hostnames) {
    hostnames.sort();

    return ip + '->[' + hostnames.join(', ') + ']';
}

function formatSrv(srvs) {
    var result = [];

    srvs.sort(function (a, b) {
        var result = cmp(a.priority, b.priority);
        if (result === 0) {
            result = cmp(a.name, b.name);
        }
        if (result === 0) {
            result = cmp(a.port, b.port);
        }

        return result;
    });
    srvs.forEach(function (rec) {
        result.push(rec.name + ':' + rec.port);
    });

    return 'SRV:' + result.join(', ');
}

function checkDone(doneCount, numParts, hostname, results, callback) {
    if ((doneCount === numParts) && (results.length > 0)) {
        callback(hostname + ' ' + results.join(' ; '));
    }
}

function infoHostnames(s, callback) {
    (s.match(hostnameRe) || []).forEach(function (hostname) {
        var doneCount = 0,
            results = [],
            numParts = 5;

        dns.resolve4(hostname, function (err, ips) {
            var ipsDoneCount = 0,
                ipResults = [];

            if (err) {
                console.log(err);
                doneCount += 1;
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
                            checkDone(doneCount, numParts, hostname, results,
                                callback);
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
            checkDone(doneCount, numParts, hostname, results, callback);
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
            checkDone(doneCount, numParts, hostname, results, callback);
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
            checkDone(doneCount, numParts, hostname, results, callback);
        });

        dns.resolveSrv(hostname, function (err, srv) {
            doneCount += 1;
            if (err) {
                console.log(err);
            } else {
                if (srv.length > 0) {
                    results.push(formatSrv(srv));
                }
            }
            checkDone(doneCount, numParts, hostname, results, callback);
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
