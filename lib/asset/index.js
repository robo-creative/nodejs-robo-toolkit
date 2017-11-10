'use-strict';
var _path = require('path');
var _root = _path.resolve(__dirname, '../../../..');

module.exports.absolute = function (relative) {
    return _path.join(_root, relative);
}