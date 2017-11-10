'use-strict';

function KeyedCollection(keyFor) {
    if (typeof keyFor !== 'function') throw new TypeError('The function that returns item for key must be specified');
    var _items = {};
    var _keys = [];

    this.add = function (item) {
        var key = keyFor(item);
        if (this.hasKey(key)) return false;
        _items[key] = item;
        _keys.push(key);
        this.onAdded(this, item);
        return true;
    };

    this.addRange = function (items) {
        var instance = this;
        items.forEach(function (item) {
            instance.add(item);
        });
    };

    this.hasKey = function (key) {
        return _keys.indexOf(key) > -1;
    };

    this.has = function (item) {
        return this.hasKey(keyFor(item));
    };

    this.get = function (key) {
        return _items[key];
    };

    this.getOrCreate = function (key, fn) {
        if (!this.hasKey(key)) {
            this.add(fn());
        }
        return this.get(key);
    };

    this.addOrUpdate = function (item, fn) {
        var key = keyFor(item);
        if (!this.hasKey(key)) {
            this.add(item);
        } else {
            var oldItem = this.get(key);
            _items[key] = fn(oldItem, item);
            this.onUpdated(this, _items[key])
        }
    };

    this.remove = function (item) {
        return this.removeKey(keyFor(item));
    };

    this.removeKey = function (key) {
        if (!this.hasKey(key)) return false;
        var item = _items[key];
        delete _items[key];
        _keys.splice(_keys.indexOf(key), 1);
        this.onRemoved(this, item);
        return true;
    };

    this.clear = function () {
        _items = {};
        _keys = [];
    }

    this.size = function () {
        return _keys.length;
    };

    this.sortKeys = function (fn) {
        if (typeof fn === 'function')
            _keys.sort(fn);
        else _keys.sort();
    }

    this.sort = function (fn) {
        _keys.sort(function (a, b) {
            return fn(_items[a], _items[b]);
        });
    }

    this.keys = function () {
        return _keys.map(function (key) {
            return key;
        });
    }

    this.values = function () {
        return _keys.map(function (key) {
            return _items[key];
        });
    };

    this.copy = function (to, predicate) {
        _keys.forEach(function (key) {
            if (predicate(_items[key]))
                to.add(_items[key]);
        });
    }

    this.toArray = function (arr, predicate) {
        if (undefined === arr) arr = [];
        _keys.forEach(function (key) {
            if (predicate(_items[key]))
                arr.push(_items[key]);
        })
        return arr;
    };

    this.every = function (predicate) {
        return _keys.every(function (key) {
            return predicate(_items[key])
        });
    };

    this.forEach = function (fn) {
        _keys.forEach(function (key) {
            return fn(_items[key])
        });
    };

    this.filter = function (fn) {
        return this.values().filter(fn);
    }

    this.map = function (mapper) {
        return _keys.map(function (key) {
            return mapper(_items[key])
        });
    }

    this.reduce = function (reducer) {
        return _keys.reduce(function (k1, k2) {
            return reducer(_items[k1], _items[k2])
        });
    }

    this.onAdded = function (collection, item) {

    }

    this.onUpdated = function (collection, item) {

    }

    this.onRemoved = function (collection, item) {

    }
}

function KeyedCollectionBuilder(keyFor) {
    if (typeof keyFor !== 'function') throw new TypeError('Invalid function');
    var _collection = new KeyedCollection(keyFor);

    this.onAdded = function (fn) {
        if (typeof fn !== 'function') throw new TypeError('Invalid function');
        _collection.onAdded = fn;
        return this;
    }

    this.onUpdated = function (fn) {
        if (typeof fn !== 'function') throw new TypeError('Invalid function');
        _collection.onUpdated = fn;
        return this;
    }

    this.onRemoved = function (fn) {
        if (typeof fn !== 'function') throw new TypeError('Invalid function');
        _collection.onRemoved = fn;
        return this;
    }

    this.collection = function () {
        return _collection;
    }
}

exports.keyed = function (keyFor) {
    return new KeyedCollectionBuilder(keyFor);
}