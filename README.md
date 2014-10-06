[![Build Status](https://travis-ci.org/benderjs/benderjs.svg?branch=master)](https://travis-ci.org/benderjs/benderjs)
[![NPM Version](http://img.shields.io/npm/v/benderjs.svg)](https://www.npmjs.org/package/benderjs)

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
 * @param {Object}   applications       Applications used in current project
 * @param {Array}    browsers           List of browsers used for testing
 * @param {Number}   captureTimeout     Timeout before which a launched browser should connect to the server
 * @param {Boolean}  debug              Enable debug logs
 * @param {String}   framework          Default framework used for the tests
 * @param {String}   hostname           Host on which the HTTP and WebSockets servers will listen
 * @param {Array}    manualBrowsers     List of browsers accepting manual tests
 * @param {Number}   manualTestTimeout  Timeout after which a manual test is marked as failed
 * @param {Array}    plugins            List of Bender plugins to load at startup (Required)
 * @param {Number}   port               Port on which the HTTP and WebSockets servers will listen
 * @param {Number}   slowAvgThreshold   Average test case duration threshold above which a test is marked as slow
 * @param {Number}   slowThreshold      Test duration threshold above which a test is marked as slow
 * @param {String}   startBrowser       Name of a browser to start when executing bender run command
 * @param {Number}   testRetries        Number of retries to perform before marking a test as failed
 * @param {Object}   tests              Test groups for the project (Required)
 * @param {Number}   testTimeout        Timeout after which a test will be fetched again
 */

var config = {
	// put your configuration here
};

module.exports = config;
```

For more information on Bender configuration, check out the Wiki - [Configuration](https://github.com/benderjs/benderjs/wiki/Configuration) page.

Usage
-----

Type `bender` to see available commands:

```
Usage: bender <command> [options]

Commands:

  clean    Clean all Bender.js local files except the configuration
  init     Initialize Bender.js for this directory
  run      Run the tests in a browser and output the results to the console
  server   Handle Bender.js server
  version  Print Bender.js version

Options:

  -c, --config    Alternative path to Bender.js configuration file [bender.js]
  -d, --debug
  -H, --hostname  Hostname used to run the server
  -p, --port      Port on which the server will listen
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

For more information on Bender command line interface, check out the Wiki - [Command line](https://github.com/benderjs/benderjs/wiki/Command-line) page.

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
