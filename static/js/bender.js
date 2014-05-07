(function (window) {

    function Bender() {
        var contextEl = document.getElementById('context');

        this.handlers = {};
        this.current = null;
        this.suite = null;

        this.emit = function (name) {
            var handlers = this.handlers[name],
                args = Array.prototype.slice.call(arguments, 1),
                i;

            if (!handlers || !handlers.length) return;

            for (i = 0; i < handlers.length; i++) handlers[i].apply(this, args);
        };

        this.on = function (name, callback) {
            if (typeof name !== 'string' || typeof callback != 'function') {
                throw new Error('Invalid arguments specified');
            }

            if (!this.handlers[name]) this.handlers[name] = [];

            this.handlers[name].push(callback);
        };

        this.error = function () {
            console.error.apply(console, arguments);
        };

        // stubbed for compatibility
        this.result = function () {};

        this.log = function () {
            console.log.apply(console, arguments);
        };

        this.next = function (summary) {
            if (summary) {
                summary.id = this.current;
                summary.success = summary.failed === 0;
                this.emit('update', summary);
            }

            this.current = this.suite.shift();

            if (this.current) {
                this.emit('update', this.current);
                contextEl.src = '/tests/' + this.current;
            } else {
                this.complete();
            }
        };

        this.complete = function () {
            this.emit('complete');
            contextEl.src = 'about:blank';
        };

        this.run = function (tests) {
            this.suite = tests;
            this.next();
        };

        // this will be overriden by a framework adapter
        this.start = this.complete;

        this.stop = function () {
            this.suite = [];
            this.complete();
        };

        this.ready = function () {
            if (typeof this.start == 'function') this.start();
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

        this.setup = function (context) {
            context.bender = this;
            context.onerror = this.error;
            this.addListener(context, 'load', this.ready, this);
        };
    }

    window.bender = new Bender();
})(this);
