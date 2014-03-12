(function () {
    var host = /^[a-z]+:\/\/([^\/]+)/.exec(window.location)[1].split(":"),
        id = /\/clients\/([^\/]+)/.exec(window.location)[1],
        busy = false,
        client;

    client = new Faye.Client('http://' + host[0] + ':' + (host[1] || 80) + '/faye', {
        timeout: 120,
        retry: 1
    });

    client.subscribe('/execute', function (tests) {
        if (!busy) runTests(tests);
    });

    client.disable('autodisconnect');
    client.addExtension({
        incoming: function (msg, callback) {
            if (msg.channel === '/meta/connect' && !msg.successful && (/^401/.test(msg.error))) {
                window.location = '/capture';
            }
            callback(msg);
        }
    });

    window.onbeforeunload = function () {
        console.log(client.publish('/client_disconnect', id));
    };

    function runTests(tests) {

    }

})();
