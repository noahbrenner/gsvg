'use strict';

var onlySpaces = /^ *$/;
var isValidIndentString = (str) => onlySpaces.test(str) || str === '\t';

var isBool = (arg) => typeof arg === 'boolean';
var isString = (arg) => typeof arg === 'string';
var isPositiveInteger = (arg) => typeof arg === 'number' &&
        arg >= 0 &&
        arg % 1 === 0;

var getCliFlag = function (flag) {
    // TODO decamelize the flag
    return flag.length === 1 ?
        '-' + flag :
        '--' + flag;
};

var getValues = function (obj) {
    return Object.keys(obj).map((key) => obj[key]);
};

var includes = (arr, item) => arr.indexOf(item) !== -1;

// cli: The object returned by meow
// validationInfo: Object containing:
//  - cliAliases (object)
//  - boolFlags (array)
//  - indentFlags (array)
//  memo: Object containing input metadata:
//  - stdin (boolean) whether input was received through stdin
//  - infile (string) optional input filename
//  - outfile (string) optional output filename
// NO_INPUT: A premade object to throw when signaling "no user input"
module.exports = function (cli, validationInfo, memo, NO_INPUT) {
    var parsedFlags = Object.keys(cli.flags).filter(function (flag) {
        // only include long flags unless there's no long version
        return (flag.length > 1) || (!validationInfo.cliAliases[flag]);
    });

    var supportedLongFlags = getValues(validationInfo.cliAliases);

    var expectBool = (flagKey) => includes(validationInfo.boolFlags, flagKey);

    // check command line flags
    parsedFlags.forEach(function (flagKey) {
        var value = cli.flags[flagKey];
        var isIndentFlag = includes(validationInfo.indentFlags, flagKey);
        var cliFlag = getCliFlag(flagKey);

        // check for unsupported flags
        if (!includes(supportedLongFlags, flagKey)) {
            throw new Error(`Invalid flag "${cliFlag}". See: gsvg --help`);
        }

        // check indent flags
        if (isIndentFlag && !isPositiveInteger(value) && !isString(value)) {
            throw new Error(`${cliFlag} must be an integer or a string`);
        }

        if (isIndentFlag && isString(value) && !isValidIndentString(value)) {
            throw new Error(`${cliFlag} <string> must be only spaces or "t"`);
        }

        // check for booleans
        if (isBool(value) && !expectBool(flagKey)) {
            throw new Error(`"${cliFlag}" requires a parameter`);
        }

        if (!isBool(value) && expectBool(flagKey)) {
            throw new Error(`"${cliFlag}" does not accept a parameter`);
        }
    });

    // check input file count
    if (memo.stdin && (cli.input.length > 1)) {
        throw new Error('Do not specify <infile> when piping to stdin');
    }

    if (cli.input.length > 2) {
        throw new Error('Only <infile> and <outfile> (and flags) are allowed');
    }

    if (!memo.stdin && !memo.infile) {
        // throw predefined object so this can be treated as a special case
        throw NO_INPUT;
    }

    if (cli.flags.inPlace) {
        if (cli.input.length === 0) {
            throw new Error('<infile> is required when using --in-place');
        }
        if (cli.input.length > 1) {
            throw new Error('<outfile> is not allowed when using --in-place');
        }
    }
};
