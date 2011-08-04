// make lousybot listen on an AMQP message queue (such as RabbitMQ) for
// messages in the form { "to" : <nick or channel>, "message" : <message> }
// which it will send to a user or channel

// the exchange can be any type (direct, fanout or topic) but both the
// exchange and the queue must already exist (this plugin does not create
// queues yet)
var amqp,
    connectParams = { host : 'localhost' },
    // optional connect params : port, login, password, vhost
    exchangeName = 'lousybot',
    queueName = 'lousybot';

try {
    amqp = require('amqp');
} catch (err) {
    console.log('amqp module failed to load, amqp plugin disabled');
}

if (amqp !== undefined) {
    exports.joinsSent = function () {
        var amqpConn = amqp.createConnection(connectParams),
            conn = this;

        amqpConn.on('ready', function () {
            amqpConn.queue(queueName, {
                passive : true
            }, function (openQ) {
                openQ.bind(exchangeName);

                openQ.subscribe(function (message) {
                    var parsedMessage = JSON.parse(message.data);

                    conn.privmsg(parsedMessage.to, parsedMessage.message);
                });
            });
        });
    };
}
