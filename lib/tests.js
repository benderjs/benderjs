// TEMPORARY TEST DATA
var tests = [
    {id: 'test-1', src: 'tests/test-1.js', name: 'Test 1', meta: ''},
    {id: 'test-2', src: 'tests/test-2.js', name: 'Test 2', meta: ''},
    {id: 'test-3', src: 'tests/test-3.js', name: 'Test 3', meta: ''},
    {id: 'test-4', src: 'tests/test-4.js', name: 'Test 4', meta: ''},
    {id: 'test-5', src: 'tests/test-5.js', name: 'Test 5', meta: ''}
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

function getTests(names) {
    return tests.filter(function (test) {
        return names.indexOf(test.id) > -1;
    });
}

module.exports.getList = getList;
module.exports.getTests = getTests;
