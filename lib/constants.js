var pkg = JSON.parse(require('fs').readFileSync(__dirname + '/../package.json').toString());

module.exports = {
    VERSION: pkg.version,
    PORT: 1030,
    HOSTNAME: 'localhost'
};