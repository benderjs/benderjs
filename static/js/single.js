(function (window, undefined) {
    var resultsEl = document.createElement('div');

    resultsEl.className = 'results';

    function escapeTags(str) {
        var replacements = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };

        return str.replace(/[&<>]/g, function (item) {
            return replacements[item] || item;
        });
    }

    function addResult(result) {
        var resEl = document.createElement('li'),
            res = [
                    '<p>', result.module, ' - ', result.name,
                    '<strong> ', result.success ? result.ignored ?
                        'IGNORED' : 'PASSED' : 'FAILED', '</strong></p>'
                ],
            i;

        if (!result.success) res.push('<pre>', escapeTags(result.error), '</pre>');

        resEl.className = result.success ? result.ignored ? 'warn' : 'ok' : 'fail';
        resEl.innerHTML = res.join('');

        resultsEl.appendChild(resEl);
    }

    function Bender() {
        this.error = function () {
            console.error.apply(console, arguments);
        };

        this.result = function (result) {
            addResult(result);
        };

        this.log = function () {
            console.log.apply(console, arguments);
        };

        // stubbed for compability
        // this might be overriden by a framework adapter
        this.start = this.next = this.complete = this.setup = function () {};
    }

    window.bender = new Bender();

    function init() {
        document.body.appendChild(resultsEl);
    }

    if (window.addEventListener) window.addEventListener('load', init, false);
    else if (window.attachEvent) window.attachEvent('onload', init);
    else window['onload'] = init;

})(this);
