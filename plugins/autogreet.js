// sometimes greet people with random greetings when they enter a channel
// greetings can optionally occur at only certain hours of the day

function actionMessage(action) {
    return String.fromCharCode(1) + 'ACTION ' + action + String.fromCharCode(1);
}

var greetingChance = 0.25,

    greetings = [
        'hey %name',
        'hi %name',
        '%name: what\'s up',
        'what\'s goin on %name?',
        'how are you today %name?',
        'it\'s %name',
        actionMessage('waves to %name'),
        actionMessage('gives %name a thumbs up')
    ],

    hourGreetings = [
        [actionMessage('salutes %name'), 5, 8],
        ['good morning %name', 6, 10],
        ['%name: mornin', 6, 10],
        ['%name: thanks for coming out today', 6, 10]
    ];

// return a random integer between start and end
function randomInt(end, start) {
    if (start === undefined) {
        start = 1;
    }

    return Math.floor(Math.random() * (end - start + 1) + start);
}

// return a random element of array a
function randomChoice(a) {
    return a[randomInt(a.length - 1, 0)];
}

// return a random greeting for name
function randomGreeting(name) {
    var choice,
        currentHour = new Date().getHours();
        hourCandidates = [];

    for (i in hourGreetings) {
        if ((currentHour >= hourGreetings[i][1]) &&
            (currentHour <= hourGreetings[i][2])) {
            hourCandidates.push(hourGreetings[i][0]);
        }    
    }

    if (hourCandidates.length > 0) {
        choice = randomChoice(hourCandidates);
    } else {
        choice = randomChoice(greetings);
    }

    return choice.replace('%name', name);
}

exports.JOIN = function (m) {
    if (m.from.nick !== this.botNick) {
        var channel = m.params[0].slice(1),
            conn = this;

        if (Math.random() < greetingChance) {
            // wait a random amount of time
            setTimeout(function () {
                conn.privmsg(channel, randomGreeting(m.from.nick));
            }, randomInt(10000, 4000));
        }
    }
};
