[![Build Status](https://travis-ci.org/benderjs/benderjs.svg?branch=master)](https://travis-ci.org/benderjs/benderjs)

Bender.js
=========

The anti-human approach to JavaScript testing.

Installation
------------

```
$ [sudo] npm install -g benderjs
```

Configuration
-------------

In order to configure Bender.js for your project, you need to create a configuration file.

Use `bender init` command to create Bender configuration file and local `.bender/` directory.

Below is an empty config file.

```javascript
/**
 * Bender configuration file
 *
 * @param {String}  assertion           Default assertion library used for the tests
 * @param {Object}  applications        Applications used in current project
 * @param {Array}   plugins             List of Bender plugins to load at startup
 * @param {Array}   browsers            List of default browsers used for testing
 * @param {Number}  slowAvgThreshold    Average test case duration threshold above which a test is marked as slow
 * @param {Number}  slowThreshold       Test duration threshold above which a test is marked as slow
 * @param {Number}  testRetries         Number of retries to perform before marking a test as failed
 * @param {Number}  testTimeout         Timeout after which a test will be fetched again
 * @param {Object}  tests               Test groups for the project
 */
var config = {};

module.exports = config;
```

Usage
-----

Type `bender` to see available commands:

```
Usage: bender <command>

command
  init        Initialize Bender.js for this directory
  clean       Clean all Bender.js local files except the configuration
  server      Start Bender.js server
  version     Print Bender.js version
```

In order to run Bender in your project, open the console in project's directory and type:

```
$ bender server run
```

This will start the server in the verbose mode.

Now open a web browser. Bender.js dashboard is available under:

```
http://localhost:1030
```

**Note:** You can also run the server as a daemon:

```
bender server start
```

At the moment, starting a daemon is supported **on Unix systems only**.

If you want, you can specify a port or a hostname where Bender.js runs:

```
-p, --port      The port on which the server will run (default: 1030).
-H, --hostname  The hostname used to run the server (default: 0.0.0.0).
```

Running tests for Bender.js
-------------

```
$ npm install
$ npm test
```

To get the code coverage report run:

```
$ npm test --coverage
```

A detailed report will be created in `./coverage/lcov-report/index.html` file.

License
-------

For license details see: [LICENSE.md](https://github.com/benderjs/benderjs/blob/master/LICENSE.md).
