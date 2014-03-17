(function (window, undefined) {
    var host = /^[a-z]+:\/\/([^\/]+)/.exec(window.location)[1].split(":"),
        id = /\/clients\/([^\/]+)/.exec(window.location)[1],
        statusEl = document.getElementById('status'),
        contextEl = document.getElementById('context'),
        busy = false,
        socket,
        states;

    states = {
        CONNECT: 0,
        RECONNECT: 1,
        RECONNECT_FAIL: 2,
        RECONNECTING: 3,
        DISCONNECT: 4
    };

    socket = io.connect('http://' + host[0] + ':' + (host[1] || 80));
    socket.on('connect', setStatus(states.CONNECT));
    socket.on('reconnect', setStatus(states.RECONNECT));
    socket.on('reconnect_failed', setStatus(states.RECONNECT_FAIL));
    socket.on('reconnecting', setStatus(states.RECONNECTING));
    socket.on('disconnect', setStatus(states.DISCONNECT));

    function setStatus(status) {
        var messages = ['Connected', 'Reconnected', 'Failed to reconnect',
            'Reconnecting in ', 'Disconnected'];

        return function (options) {
            var msg = messages[status];
            statusEl.innerHTML = msg + (options ? options + 'ms...' : '');
            statusEl.className = status === states.CONNECT ? 'ok' :
                (status === states.RECONNECT || status === states.RECONNECTING) ? 'warn' :
                (status === states.RECONNECT_FAIL || states.DISCONNECT) ? 'fail' : '';
        };
    }

    function Bender(socket) {
        this.suite = null;
        this.results = [];

        // TODO expose assertion library here
        this.assert = null;

        this.test = function (spec) {
            // TODO execute spec here
            // should we wait for onload or just run the tests?
        };

        this.error = function (error) {
            socket.emit('error', error);
        };

        this.result = function (result) {
            this.results.push(result);
            socket.emit('result', result);
        };

        this.next = function () {
            var test = this.suite.shift();

            if (test) {
                contextEl.src = '../' + test.src;
            } else {
                this.complete();
            }
        };

        this.complete = function () {
            socket.emit('complete');
            contextEl.src = 'about:blank';
        };

        this.log = function (args) {
            // TODO add some formatting, maybe stringify objects?
            socket.emit('log', Array.prototype.join.call(arguments, ' '));
        };

        this.setup = function (context) {
            var that = this;

            context.bender = this;
            context.onerror = this.error;

            function stealLogs() {
                var commands = ['log', 'info', 'warn', 'debug', 'error'],
                    replace = function(command) {
                        var old = context.console[command];

                        context.console[command] = function () {
                            that.log(arguments);
                            if (old) Function.prototype.apply.call(old, context.console, arguments);
                        };
                    },
                    i;

                context.console = context.console || {};

                for (i = 0; i < commands.length; i++) {
                    replace(commands[i]);
                }

                context.alert = function (msg) {
                    that.log(msg);
                };
            }
            stealLogs();
        };

        function register() {
            socket.emit('register', {
                id: id,
                ua: navigator.userAgent
            });
        }

        function runTests(suite) {
            this.suite = suite;
            this.next();
        }

        socket.on('connect', register);
        socket.on('run', runTests.bind(this));
    }

    window.bender = new Bender(socket);

})(window);
