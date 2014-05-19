/**
 * @file Page builder responsible for assertion library resources
 */

function build(data) {
    var head = ['<head>'];

    if (!data.assertion) return data;

    data.assertion.css.forEach(function (css) {
        head.push('<link rel="stylesheet" href="' + css + '">');
    });
    data.assertion.js.forEach(function (js) {
        head.push('<script src="' + js + '"></script>');
    });

    head.push('</head>');

    data.parts.push(head.join(''));

    return data;
}

module.exports = {
    name: 'bender-pagebuilder-assertion',
    build: build
};
