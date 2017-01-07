// This module tests everything in the CLI that can be tested without spawning
// new processes. The few that need a new process (mostly --help and --version)
// are in cli-spawn.test.js

'use strict';

import test from 'ava';

var cli = require('../cli');

var err = {
    shiftwidth: '  GSVG: --shiftwidth must be an integer or a string\n',
    shiftwidthStr: '  GSVG: --shiftwidth <string> must be only spaces or "t"\n'
};

// === TESTS === //

// non-error output is sent to stdout
test('output goes to stdout', async t => {
    var result = await cli([], '<svg />');
    t.truthy(result.stdout);
    t.is(result.stdout, '<svg />\n');
});

// short flags are translated to their long counterparts
test('-i means --in-place', async t => {
    var result = await cli(['-i']);
    t.true(result.flags.inPlace);
});

test('-s means --shiftwidth', async t => {
    var result = await cli(['-s']);
    t.true(result.flags.shiftwidth);
});

test('-a means --attr-extra-indent', async t => {
    var result = await cli(['-a']);
    t.true(result.flags.attrExtraIndent);
});

// flags are parsed correctly
test('--shiftwidth 0', async t => {
    var result = await cli(['--shiftwidth', '0']);
    t.is(result.flags.shiftwidth, 0);
});

test('--shiftwidth 3', async t => {
    var result = await cli(['--shiftwidth', '3']);
    t.is(result.flags.shiftwidth, 3);
});

test('--shiftwidth <space>', async t => {
    var result = await cli(['--shiftwidth', ' ']);
    t.is(result.flags.shiftwidth, ' ');
});

test('--shiftwidth <empty string>', async t => {
    var result = await cli(['--shiftwidth', '']);
    t.is(result.flags.shiftwidth, '');
});

test('--shiftwidth t -> is translated to tab', async t => {
    var result = await cli(['--shiftwidth', 't']);
    t.is(result.flags.shiftwidth, '\t');
});

test('--shiftwidth tt -> gives an error', async t => {
    var result = await cli(['--shiftwidth', 'tt']);
    t.is(result.stderr, err.shiftwidthStr);
    t.is(result.exitCode, 1);
});

test('--shiftwidth t<space> -> gives an error', async t => {
    var result = await cli(['--shiftwidth', 't ']);
    t.is(result.stderr, err.shiftwidthStr);
    t.is(result.exitCode, 1);
});

test('--shiftwidth z -> gives an error', async t => {
    var result = await cli(['--shiftwidth', 'z']);
    t.is(result.stderr, err.shiftwidthStr);
    t.is(result.exitCode, 1);
});

test('--shiftwidth (empty) -> gives an error', async t => {
    var result = await cli(['--shiftwidth']);
    t.is(result.stderr, err.shiftwidth);
    t.is(result.exitCode, 1);
});

test('--shiftwidth 1.5 -> gives an error', async t => {
    var result = await cli(['--shiftwidth', '1.5']);
    t.is(result.stderr, err.shiftwidth);
    t.is(result.exitCode, 1);
});

test.todo('fake flag');
test.todo('short fake flag');

// TODO tests that require tmp files:
// * filenames are sorted correctly into infile and outfile
// * same as above, taking stdin into account
// * outfile is created correctly (and user is prompted if it already exists)
// * --in-place works
