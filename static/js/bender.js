(function (window) {
    var isIE = navigator.userAgent.match(/msie (\d+)/i);

    function Bender() {
        var testFrame = document.getElementById('context'),
            testWindow = null,
            runs = 0;

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
            var id;

            if (typeof summary == 'object' && summary !== null) {
                summary.id = this.current;
                summary.success = summary.failed === 0;
                this.emit('update', summary);
            }

            this.current = this.suite.shift();

            if (this.current) {
                id = '/tests/' + this.current;
                runs++;

                this.emit('update', this.current);

                if (isIE) {
                    if (runs >= 20 && testWindow) {
                        testWindow.close();
                        setTimeout(function () {
                            runs = 0;
                            window.open(id, 'bendertest');
                        }, 300);
                    } else {
                        testWindow = window.open(id, 'bendertest');
                    }
                } else {
                    testFrame.src = id;
                }
            } else {
                this.complete();
            }
        };

        this.complete = function () {
            this.emit('complete');

            if (isIE && testWindow) testWindow.close();
            else testFrame.src = 'about:blank';
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

        this.setup = function (context) {
            context.bender = this;
            context.onerror = this.error;
        };
    }

    window.bender = new Bender();
})(this);
