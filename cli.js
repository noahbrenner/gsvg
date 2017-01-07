#!/usr/bin/env node
'use strict';

var fs = require('fs');

var Promise = require('bluebird');
var getStdin = require('get-stdin');
var meow = require('meow');

var validateArgs = require('./lib/validate-cli-args');
var gsvg = require('./');

// eslint-disable-next-line no-use-extend-native/no-use-extend-native
fs = Promise.promisifyAll(fs);

// is this module imported or is it run as a CLI?
var isImportedModule = require.main !== module;

// validateArgs uses this
var validationInfo = {
    cliAliases: {
        // meow will decamelize any camelCase options
        h: 'help',
        v: 'version',
        i: 'inPlace',
        s: 'shiftwidth',
        a: 'attrExtraIndent'
    },
    boolFlags: [
        'help',
        'version',
        'inPlace'
    ],
    indentFlags: [
        'shiftwidth',
        'attrExtraIndent'
    ]
};

var minimistOptions = {
    alias: validationInfo.cliAliases
};

var meowOptionsTemplate = {
    inferType: true,
    help: `
      Usage
        $ gsvg --help
        $ gsvg --version
        $ gsvg [flags/options] [<infile>] [<outfile>]
        $ echo "<svg></svg>" | gsvg [flags/options] [<outfile>]

      <infile> Input filename
          If a string is piped to GSVG, that will be used as the input and
          the first positional argument will be treated as <outfile> instead.

      <outfile> Output filename
          The file will be overwritten if it exists.
          If <outfile> is omitted, output will be piped to stdout.

      Flags
        -h, --help,         Display this message
        -v, --version       Display version number

        -i, --in-place      Change file in place
            Requires: <infile>
            Excludes: piping, <outfile>

      Options
        -s, --shiftwidth        Shiftwidth used for indentation
        -a, --attrExtraIndent   Add this to shifwidth for attribute lines
            <integer> Number of spaces (default 2)
            <string>  String of only spaces or only 't' character(s);
                      't' will be converted to tab

      Examples
        $ gsvg --shiftwidth 4
        $ gsvg -s t
        $ gsvg -s '  '
    `
};

/* TODO check for these error codes in catch block of promise chain
var getFileContents = function (filePath) {
    filePath = path.normalize(filePath);

    return fs.readFileAsync(filePath, 'utf8')
        .catch(function (err) {
            Object.keys(err).forEach((k) => console.log(`${k}: ${err[k]}`));
            if (err.code === 'ENOENT') {
                throw new Error('  File does not exist');
            } else if (err.code === 'EISDIR') {
                throw new Error('  Path is a directory, not a file');
            } else if (err.code === 'EACCES') {
                throw new Error('  Permission denied to access file');
            } else if (err.code === 'EPERM') {
                throw new Error('  Elevated permissions required to read file');
            }
        });
};
*/

module.exports = function (cliArgs, testStdin) {
    // `cliArgs` and `testStdin` are optional and only used for tests

    var meowOptions = Object.assign({}, meowOptionsTemplate);

    // if we're running tests, use passed in args instead of process.argv
    if (isImportedModule) {
        meowOptions.argv = cliArgs || [];
    }

    var cli = meow(meowOptions, minimistOptions);

    var result = {
        flags: cli.flags,
        files: cli.input
    };

    // use bluebird promise instead of the one returned by getStdin()
    return Promise.resolve().then(function () {
        // only check for real stdin if this file is run directly
        return isImportedModule ?
            testStdin :
            getStdin();
    }).then(function (stdin) {
        // get input from stdin or input file
        if (stdin) {
            result.stdin = stdin;
            return stdin;
        }

        if (cli.input[0]) {
            result.infile = cli.input[0];
            return fs.readFileAsync(result.infile, 'utf8');
        }
    }).tap(function () {
        // set up filenames
        // it's OK if cli.input[x] is undefined, that's still falsy
        if (result.stdin) {
            result.outfile = cli.input[1];
        } else {
            result.infile = cli.input[0];
            result.outfile = cli.input[1];
        }

        // change 't' to '\t' for cli flags which set indent
        validationInfo.indentFlags.forEach(function (flag) {
            if (cli.flags[flag] === 't') {
                cli.flags[flag] = '\t';
            }
        });
    }).tap(function () {
        // this will throw errors if any input is invalid
        return validateArgs(cli, validationInfo, result);
    }).then(function (input) {
        // process the input
        return gsvg(input, cli.flags);
    }).then(function (output) {
        // write to a file if the user asked for that
        if (result.outfile) {
            result.stdout = '';
            // TODO prompt user first if file exists and !cli.flags.inPlace
            return fs.writeFileAsync(result.outfile, output, 'utf8');
        }

        return output;
    }).catch(function (err) {
        // catch errors and return error messages for humans

        result.exitCode = 1;

        if (err.message === 'NO INPUT') {
            return cli.help;
        }

        if (err.name === 'Error') {
            return `  GSVG: ${err.message}`;
        }

        console.error(`name: ${err.name}`);
        console.error(`code: ${err.code}`);
        console.error(`syscall: ${err.syscall}`);
        console.error(`path: ${err.path}`);
        console.error(`  GSVG: ${err.message}`);
        // name: Error
        // code: ENOENT
        // syscall: open
        // path: D:\Harper\js\gsvg\a
        // ENOENT: no such file or directory, open 'D:\Harper\js\gsvg\a'
    }).then(function (output) {
        // collect and return all our data

        if (result.exitCode >= 1) {
            result.stdout = '';
            result.stderr = output + '\n';
        } else {
            result.exitCode = 0;
            result.stdout = output || '';
            result.stderr = '';
        }

        // result: (object)
        // - stdin (string || undefined)
        // - stdout (string)
        // - stderr (string)
        // - exitCode (number)
        // - infile (string || undefined)
        // - outfile (string || undefined)
        // - flags (object)
        // - input (array) filenames which were sorted into infile and outfile
        return result;
    });
};

if (!isImportedModule) {
    module.exports().then(function (result) {
        process.stdout.write(result.stdout);
        process.stderr.write(result.stderr);
        process.exitCode = result.exitCode;
    });
}
