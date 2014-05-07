/**
 * @file Bender configuration file
 * 
 * @example
 *  var config = {
 *      // default assertion for the project
 *      assertion: 'qunit',
 *      
 *      // project's applications definition
 *      applications: {
 *          'my-app': {
 *              path: 'foo/',
 *              url: 'foo/',
 *              files: [
 *                  'foo.js',
 *                  'bar.css'
 *              ]
 *          }
 *      },
 *      
 *      // plugins to load
 *      plugins: [
 *          'bender-qunit'
 *      ],
 *
 *      // default browsers used for testing
 *      browsers: [
 *          'PhantomJS', 'IE8', 'IE9', 'IE10', 'IE11',
 *          'Firefox', 'Safari', 'Chrome', 'Opera'
 *      ],
 *
 *      // test execution timeout
 *      testTimeout: 1000,
 *
 *      // test groups definition
 *      tests: {
 *          'my-tests-1': {
 *              applications: ['my-app'],
 *              assertion: 'qunit',
 *              basePath: 'tests/',
 *              paths: [
 *                  '1/',
 *                  '!assets/'
 *              ]
 *          }
 *      }
 *  };
 *
 *  module.exports = config;
 */

var config = {

};

module.exports = config;
