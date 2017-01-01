#!/usr/bin/env node
'use strict';

var assert = require('assert');
var fs = require('fs');

var Promise = require('bluebird');
var getStdin = require('get-stdin');
var meow = require('meow');

var gsvg = require('./');

// eslint-disable-next-line no-use-extend-native/no-use-extend-native
fs = Promise.promisifyAll(fs);

var cliAliases = {
    // meow will decamelize any camelCase options
    h: 'help',
    v: 'version',
    i: 'inPlace',
    s: 'shiftwidth',
    a: 'attrExtraIndent'
};

var cli = meow({
    help: `
      Usage
        $ gsvg --help
        $ gsvg --version
        $ gsvg [flags/options] [<infile>] [<outfile>]
        $ echo "<svg></svg>" | gsvg [flags/options] [<outfile>]

      <infile> Input filename
          If a string is piped to gsvg, that will be used as the input and
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
    `,
    inferType: true
}, {
    alias: cliAliases
});

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

var flags = cli.flags; // object
var files = cli.input; // array
var memo = {};

Promise.all([
    // get input from stdin or input file
    getStdin().then(function (stdin) {
        if (stdin) {
            memo.stdin = true;
            return stdin;
        }
        if (cli.input[0]) {
            memo.infile = cli.input[0];
            // return getFileContents(cli.input[0]);
            return fs.readFileAsync(cli.input[0], 'utf8');
        }
        throw new Error('NO INPUT');
    }),
    // validate what we can before knowing if there's stdin input
    Promise.resolve().then(function () {
        var boolFlags = [
            'h', 'help',
            'v', 'version',
            'i', 'inPlace'
        ];
        var stringFlags = [
            'shiftwidth',
            'attrExtraIndent'
        ];
        var onlySpaces = /^ *$/;
        var onlyTabs = /^\t*$/;

        var supportedFlags = Object.keys(cliAliases)
            .map((key) => cliAliases[key]);

        Object.keys(flags).forEach(function (flag) {
            flag = cliAliases[flag] || flag;
            // TODO decamelize the flag
            var fullFlag = flag.length === 1 ?
                '-' + flag :
                '--' + flag;

            assert(supportedFlags.indexOf(flag) !== -1,
                    `Invalid flag "${fullFlag}". See: gsvg --help`);

            if (boolFlags.indexOf(flag) === -1) {
                assert(typeof flags[flag] !== 'boolean',
                    `The flag "${fullFlag}" requires a parameter`);
            } else {
                assert(typeof flags[flag] === 'boolean',
                    `Boolean flag "${fullFlag}" does not accept a parameter`);
            }
        });

        assert(!flags.inPlace || files.length === 1,
                '<infile> is required when using --in-place');

        assert(cli.input.length <= 2,
                'No more than 2 positional arguments are allowed');

        // TODO abstract this repetitive mess
        assert(flags.shiftwidth === undefined ||
                typeof flags.shiftwidth === 'number' ||
                typeof flags.shiftwidth === 'string',
                '--shiftwidth must be an integer or a string');

        assert(typeof flags.shiftwidth !== 'number' ||
                flags.shiftwidth % 1 === 0,
                '--shiftwidth <number> must be an integer');

        assert(typeof flags.shiftwidth !== 'string' ||
                onlySpaces.test(flags.shiftwidth) ||
                onlyTabs.test(flags.shiftwidth),
                '--shiftwidth <string> must be only spaces or "t"');

        assert(flags.attrExtraIndent === undefined ||
                typeof flags.attrExtraIndent === 'number' ||
                typeof flags.attrExtraIndent === 'string',
                '--attr-extra-indent must be an integer or a string');

        assert(typeof flags.attrExtraIndent !== 'number' ||
                flags.attrExtraIndent % 1 === 0,
                '--attr-extra-indent <number> must be an integer');

        assert(typeof flags.attrExtraIndent !== 'string' ||
                onlySpaces.test(flags.attrExtraIndent) ||
                onlyTabs.test(flags.attrExtraIndent),
                '--attr-extra-indent <string> must be only spaces or "t"');

        // change 't' to '\t' for cli flags which set indent
        stringFlags.forEach(function (flag) {
            if (onlyTabs.test(flags[flag])) {
                flags[flag] = flags[flag].replace(/t/g, '\t');
            }
        });
    })
]).tap(function () {
    // set up options

    if (memo.stdin) {
        assert(files.length < 2,
                'Do not specify <infile> when piping to stdin');

        memo.outfile = files[1]; // it's OK if files[1] is undefined
    } else {
        memo.infile = files[0];
        memo.outfile = files[1];
    }
}).spread(function (input) {
    return gsvg(input, flags);
}).then(function (output) {
    if (memo.outfile) {
        // TODO if file exists and !flags.inPlace, prompt user to confirm
        return fs.writeFileAsync(memo.outfile, output, 'utf8');
    }

    return process.stdout.write(output);
}).catch(function (err) {
    process.exitCode = 1;
    if (err.name === 'AssertionError') {
        return console.error(`  gsvg: ${err.message}`);
    }
    if (err.message === 'NO INPUT') {
        return console.error(cli.help);
    }
    console.error(`name: ${err.name}`);
    console.error(`code: ${err.code}`);
    console.error(`syscall: ${err.syscall}`);
    console.error(`path: ${err.path}`);
    console.error(`  gsvg: ${err.message}`);
// name: Error
// code: ENOENT
// syscall: open
// path: D:\Harper\js\gsvg\a
// ENOENT: no such file or directory, open 'D:\Harper\js\gsvg\a'
});
