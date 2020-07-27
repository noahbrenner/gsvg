'use strict';

var parser = require('./lib/parser');
var renderer = require('./lib/renderer');

var getLines = function (xmlString, opt) {
    opt = opt || {};

    return parser(xmlString).then(function (tokens) {
        return renderer(tokens, opt);
    });
};

String.prototype.isBlank = function () {
    return ! /\S/.test(this);
};

var removeBlankStrings = function (arr) {
    return arr.filter(function (el) {
        return ! el.isBlank();
    });
};

module.exports = function (xmlString, opt) {
    return getLines(xmlString, opt).then(function (lines) {
        return removeBlankStrings(lines).join('\n') + '\n';
    });
};

module.exports.array = getLines;
