'use-strict';
let _targetItems = new WeakMap();
let _global = new Map();

let _itemsFor = function (target) {
    if (undefined === target) return _global;
    if (!_targetItems.has(target)) {
        _targetItems.set(target, new Map());
    }
    return _targetItems.get(target);
}

function Scope(target) {

    this.get = function (key) {
        return _itemsFor(target).get(key);
    }

    this.set = function (key, value) {
        _itemsFor(target).set(key, value);
    }

    this.delete = function (key) {
        return _itemsFor(target).delete(key);
    }

    this.clear = function () {
        _itemsFor(target).clear();
    }
}

exports = module.exports = function (target) {
    return new Scope(target);
};
exports.global = new Scope();