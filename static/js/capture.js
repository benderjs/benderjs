(function (window, undefined) {
    var host = /^[a-z]+:\/\/([^\/]+)/.exec(window.location)[1].split(":"),
        id = /\/clients\/([^\/]+)/.exec(window.location)[1],
        statusEl = document.getElementById('status'),
        contextEl = document.getElementById('context'),
        states = {
            CONNECT: 0,
            RECONNECT: 1,
            RECONNECT_FAIL: 2,
            RECONNECTING: 3,
            DISCONNECT: 4
        },
        socket = io.connect(
            'http://' + host[0] + ':' + (host[1] || 80) + '/client',
            {
                'reconnection limit': 2000,
                'max reconnection attempts': 30
            }
        );

    socket
        .on('connect', setStatus(states.CONNECT))
        .on('reconnect', setStatus(states.RECONNECT))
        .on('reconnect_failed', setStatus(states.RECONNECT_FAIL))
        .on('reconnecting', setStatus(states.RECONNECTING))
        .on('disconnect', setStatus(states.DISCONNECT));

    function setStatus(status) {
        var messages = [
                'Connected', 'Reconnected', 'Failed to reconnect',
                'Reconnecting in ', 'Disconnected'
            ];

        return function (options) {
            var msg = messages[status];
            statusEl.innerHTML = msg + (options ? options + 'ms...' : '');
            statusEl.className = status === states.CONNECT ? 'ok' :
                (status === states.RECONNECT || status === states.RECONNECTING) ? 'warn' :
                (status === states.RECONNECT_FAIL || states.DISCONNECT) ? 'fail' : '';
        };
    }

    function Bender(socket) {
        var that = this;

        this.assert = null;
        this.current = null;

        this.results = {
            results: [],
            suite: null
        };

        this.error = function (error) {
            socket.emit('error', error);
        };

        this.result = function (result) {
            var res = {
                    id: this.current,
                    result: result
                };

            this.results.results.push(res);
            socket.emit('result', res);
        };

        this.next = function () {
            if (this.current) {
                contextEl.src = '../tests/' + this.current;
                this.current = null;
            } else {
                this.complete();
            }
        };

        this.complete = function () {
            socket.emit('complete', this.results);
            contextEl.src = 'about:blank';
            this.results.results.length = 0;
            this.results.suite = null;
        };

        this.log = function () {
            socket.emit('log', Array.prototype.join.call(arguments, ' '));
        };

        // this will be overriden by a framework adapter
        this.start = this.complete;

        this.ready = function () {
            if (typeof this.start == 'function') {
                this.start();
            }

            this.start = null;
        };

        this.addListener = function (target, name, callback, scope) {
            function handler () { callback.call(scope || this); }

            if (target.addEventListener) {
                target.addEventListener(name, handler, false);
            } else if (target.attachEvent) {
                target.attachEvent('on' + name, handler);
            } else {
                target['on' + name] = handler;
            }
        };

        this.removeListener = function (target, name, callback) {
            if (target.removeEventListener) {
                target.removeEventListener(name, callback, false);
            } else {
                target.detachEvent('on' + name, callback);
            }
        };

        this.setup = function (context, steal) {
            context.bender = this;
            context.onerror = this.error;

            this.addListener(context, 'load', this.ready, this);

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

            if (steal) stealLogs();
        };

        socket.on('connect', function () {
            socket.emit('register', {
                id: id,
                ua: navigator.userAgent
            });
        });

        socket.on('run', function (id) {
            that.current = id;
            that.next.call(that);
        });
    }

    window.bender = new Bender(socket);

})(window);
