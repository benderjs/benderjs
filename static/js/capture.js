(function (window, undefined) {
    var statusEl = document.getElementById('status'),
        states = {
            CONNECT: 0,
            RECONNECT: 1,
            RECONNECT_FAIL: 2,
            RECONNECTING: 3,
            DISCONNECT: 4
        },
        socket = io.connect(
            'http://' + window.location.hostname + ':' + (window.location.port || 80) + '/client',
            {
                'reconnection delay': 2000,
                'reconnection limit': 2000,
                'max reconnection attempts': Infinity
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
        var contextEl = document.getElementById('context'),
            that = this,
            fetchInterval = null;

        this.assert = null;
        this.current = null;
        this.running = false;
        this.results = null;

        this.error = function (error) {
            socket.emit('error', error);
        };

        this.result = function (result) {
            this.results.results.push(result);
            socket.emit('result', result);
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
            socket.emit('fetch'); // let's speed up the fetching
            contextEl.src = 'about:blank';
            this.running = false;
            this.results = null;
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

        function startFetch() {
            fetchInterval = setInterval(function () {
                if (!that.running) socket.emit('fetch');
            }, 2000);
        }

        function stopFetch() {
            if (fetchInterval) clearInterval(fetchInterval);
        }

        socket.on('connect', function () {
            var id = /\/clients\/([^\/]+)/.exec(window.location)[1];

            socket.emit('register', {
                id: id,
                ua: navigator.userAgent
            });

            startFetch();
        });

        socket.on('disconnect', function () {
            stopFetch();
        });

        socket.on('run', function (data) {
            that.current = data.id;
            data.results = [];
            that.results = data;
            that.running = true;

            that.next.call(that);
        });
    }

    window.bender = new Bender(socket);

})(window);
