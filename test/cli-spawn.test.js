// This module tests the CLI by spawning new processes. It only includes tests
// that can't be run in cli.test.js which actually imports cli.js as a module
// and can run tests much faster since it runs in a single process.
//
// The tests in this file include:
// - Output of --help and --version because they are handled by `meow` which
// calls process.exit() before the module can return a value.
// - Check that GSVG's calculated data is output correctly on the console. The
// data itself is not the focus of these tests.

'use strict';

import test from 'ava';

var gsvgSpawn = require('./_spawn-helper');

// define macro
var testIO = async function (t, cliArgs, opt) {
    // extract from `opt` and set defaults
    var {
        stdin = '',
        exitCode = 0,
        stderrCompare = 'is', stderr = '',
        stdoutCompare = 'is', stdout = ''
    } = opt;

    t.truthy(exitCode || stderr || stdout, 'Test Error: no expected output');

    var stdio = await gsvgSpawn(stdin, cliArgs);

    t[stdoutCompare](stdio.stdout, stdout);
    t[stderrCompare](stdio.stderr, stderr);
    t.is(stdio.exitCode, exitCode);
};

// === TESTS === //

var helpRegex = /^\n {2}Git-Friendly SVG\n\n {2}Usage\n/;
var versionRegex = /^\d+\.\d+\.\d+\n$/;

// help
test('display help', testIO, ['--help'], {
    stdoutCompare: 'regex',
    stdout: helpRegex
});

test('display help - short flag', testIO, ['-h'], {
    stdoutCompare: 'regex',
    stdout: helpRegex
});

test('display help when no input received', testIO, [], {
    exitCode: 1,
    stderrCompare: 'regex',
    stderr: helpRegex
});

// version
test('display version', testIO, ['--version'], {
    stdoutCompare: 'regex',
    stdout: versionRegex
});

test('display version - short flag', testIO, ['-v'], {
    stdoutCompare: 'regex',
    stdout: versionRegex
});

// stderr
test('false flag', testIO, ['--zomg-fake'], {
    exitCode: 1,
    stderrCompare: 'regex',
    stderr: /GSVG: Invalid flag/
});

// stdout
test('shiftwidth', testIO, ['--shiftwidth', 1], {
    stdin: '<g><g></g></g>',
    exitCode: 0,
    stdout: '<g>\n <g>\n </g>\n</g>\n'
});
