(function () {
    var statusEl = document.getElementById('status'),
        isIE = navigator.userAgent.match(/msie (\d+)/i),
        oldIE = isIE && isIE[1] < 9,
        fetchInterval = null,
        testTimeout = null,
        states = {
            CONNECT: 0,
            RECONNECT: 1,
            RECONNECT_FAIL: 2,
            RECONNECTING: 3,
            DISCONNECT: 4
        },
        socket;

    function clearTestTimeout() {
        if (testTimeout) clearTimeout(testTimeout);
    }

    function resetTestTimeout() {
        if (!BENDER_TEST_TIMEOUT) return;

        testTimeout = setTimeout(function () {
            // reload the page if frozen
            window.location.reload();
        }, BENDER_TEST_TIMEOUT);
    }

    addListener = function (target, name, callback, scope) {
        function handler () { callback.call(scope || this); }

        if (target.addEventListener) target.addEventListener(name, handler, false);
        else if (target.attachEvent) target.attachEvent('on' + name, handler);
        else target['on' + name] = handler;
    };

    removeListener = function (target, name, callback) {
        if (target.removeEventListener) target.removeEventListener(name, callback, false);
        else if (target.detachEvent) target.detachEvent('on' + name, callback);
        else target['on' + name] = undefined;
    };

    function Bender(socket) {
        var testFrame = document.getElementById('context'),
            testWindow = null,
            that = this;

        this.assert = null;
        this.current = null;
        this.running = false;
        this.results = null;

        this.error = function (error) {
            socket.emit('error', error);
        };

        this.result = function (result) {
            if (!result.success) this.results.success = false;
            this.results.results.push(result);
            resetTestTimeout();
        };

        this.next = function () {
            if (this.current) {
                testFrame.src = this.current;
                this.current = null;
                resetTestTimeout();
            } else {
                clearTestTimeout();
                this.complete();
            }
        };

        this.complete = function () {
            socket.emit('complete', this.results);
            
            if (isIE) {

            } else {
                testFrame.src = 'about:blank';
            }
            this.running = false;
            this.results = null;
            socket.emit('fetch');
        };

        this.log = function () {
            socket.emit('log', Array.prototype.join.call(arguments, ' '));
        };

        // this will be overriden by a framework adapter
        this.start = this.complete;

        this.ready = function () {
            if (typeof this.start == 'function') this.start();
            this.start = null;
        };

        this.setup = function (context, steal) {
            context.bender = this;

            if (steal) context.onerror = this.error;

            addListener(context, 'load', this.ready, this);

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
    }

    function startFetch() {
        fetchInterval = setInterval(function () {
            if (!bender.running) socket.emit('fetch');
        }, 2000);
    }

    function stopFetch() {
        if (fetchInterval) clearInterval(fetchInterval);
    }

    function setStatus(status) {
        var messages = [
                'Connected', 'Reconnected', 'Failed to reconnect',
                'Reconnecting in ', 'Disconnected'
            ];

        return function (options) {
            statusEl.innerHTML = messages[status] + (options ? options + 'ms...' : '');
            statusEl.className = status === states.CONNECT ? 'ok' :
                (status === states.RECONNECT || status === states.RECONNECTING) ? 'warn' :
                (status === states.RECONNECT_FAIL || states.DISCONNECT) ? 'fail' : '';
        };
    }

    socket = io.connect(
        'http://' + window.location.hostname + ':' + (window.location.port || 80) + '/client',
        {
            'reconnection delay': 2000,
            'reconnection limit': 2000,
            'max reconnection attempts': Infinity
        }
    );

    // handle socket connection status
    socket
        .on('connect', setStatus(states.CONNECT))
        .on('connect', function () {
            var id = /\/clients\/([^\/]+)/.exec(window.location)[1];

            socket.emit('register', {
                id: id,
                ua: navigator.userAgent
            }, startFetch);

            
        })
        .on('reconnect', setStatus(states.RECONNECT))
        .on('reconnect_failed', setStatus(states.RECONNECT_FAIL))
        .on('reconnecting', setStatus(states.RECONNECTING))
        .on('disconnect', setStatus(states.DISCONNECT))
        .on('disconnect', stopFetch);

    // handle socket run message
    socket.on('run', function (data) {
        data.results = [];
        data.success = true;

        bender.current = data.id;
        bender.results = data;
        bender.running = true;

        bender.next();
    });

    window.bender = new Bender(socket);

})();
