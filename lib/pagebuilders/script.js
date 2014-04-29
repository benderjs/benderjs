var readFile = require('when/node').lift(require('fs').readFile);

function build(data) {
    if (!data.js) return data;

    data.parts.push(readFile(data.js).then(function (script) {
        return '<script>(function (bender) {' + script +
            '})(window.bender || {});</script>';
    }));

    return data;
}

module.exports = {
    name: 'bender-pagebuilder-script',
    build: build
};
