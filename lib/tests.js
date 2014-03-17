// TEMPORARY TEST DATA
var tests = [
    {id: 'test-1', src: 'tests/test-1.js', meta: '-'},
    {id: 'test-2', src: 'tests/test-2.js', meta: '-'},
    {id: 'test-3', src: 'tests/test-3.js', meta: '-'},
    {id: 'test-4', src: 'tests/test-4.js', meta: '-'},
    {id: 'test-5', src: 'tests/test-5.js', meta: '-'}
];

function Test() {}

Test.prototype.getHtml = function () {
    return '';
};

Test.prototype.getCss = function () {
    return '';
};

function getList() {
    return tests.map(function (test) {
        return {
            id: test.id,
            name: test.name,
            meta: test.meta
        };
    });
}

function getTest(id) {
    return tests.filter(function (test) {
        return test.id === id;
    })[0];
}

function getTests(ids) {
    return tests.filter(function (test) {
        return ids.indexOf(test.id) > -1;
    });
}

module.exports.getList = getList;
module.exports.getTest = getTest;
module.exports.getTests = getTests;
