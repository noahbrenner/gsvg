'use strict';

var parser = require('./lib/parser');
var renderer = require('./lib/renderer');

var getLines = function (xmlString, opt) {
    opt = opt || {};

    return parser(xmlString).then(function (tokens) {
        return renderer(tokens, opt);
    });
};

module.exports = function (xmlString, opt) {
    return getLines(xmlString, opt).then(function (lines) {
        return lines.join('\n') + '\n';
    });
};

module.exports.array = getLines;
