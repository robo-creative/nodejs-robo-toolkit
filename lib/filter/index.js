'use strict';

const {
    keyed
} = require('../collection');

function Filter() {

    this.apply = function (request) {
        return Promise.resolve(request);
    }
}

function Filters(name) {
    Filter.call(this);
    let _filters = [];

    this.name = function () {
        return name;
    }

    this.add = function (filter, priority) {
        _filters.push({
            filter,
            priority
        });
        _filters = _filters.sort((a, b) => a.priority - b.priority);        
    }

    this.apply = function (request) {
        return _filters.reduce((a, b) => {
            return new Promise((resolve, reject) => {
                a.then(result => {
                    b.filter.apply(result).then(result => {
                        resolve(result);
                    }).catch(ex => {
                        reject(ex);
                    })
                }).catch(ex => {
                    reject(ex);
                })
            })
        }, Promise.resolve(request));
    }
}
Filters.prototype = Object.create(Filter.prototype);
Filters.prototype.constructor = Filters;

function FilterManager() {

    let _filterMap = keyed(filters => filters.name()).collection();

    this.add = function (name, filter, priority) {
        if (undefined === priority) priority = 0;
        let filters = _filterMap.getOrCreate(name, () => new Filters(name));
        filters.add(filter, priority);
    }

    this.apply = function (name, request) {
        return _filterMap.getOrCreate(name, () => new Filters(name)).apply(request);
    }

    this.create = function (apply) {
        return {
            apply: apply
        };
    }
}
exports.createManager = () => new FilterManager();
let globalManager = exports.createManager();
exports.apply = (name, request) => globalManager.apply(name, request);
exports.add = (name, filter, priority) => globalManager.add(name, filter, priority);
exports.create = apply => globalManager.create(apply);