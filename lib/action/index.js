'use strict';

const {
    keyed
} = require('../collection');

function Action() {

    this.do = function () {}
}

function Actions(name) {
    Action.call(this);
    var _actions = [];

    this.name = function () {
        return name;
    }

    this.add = function (action, priority) {
        _actions.push({
            action,
            priority
        });
        _actions = _actions.sort((a, b) => a.priority - b.priority);
    }

    this.do = function () {
        var args = [].slice.call(arguments);
        return Promise.all(_actions.map(item => {
            return new Promise((resolve, reject) => {
                item.action.do.apply(item.action, args).then(() => {
                    resolve();
                }).catch(ex => {
                    reject(ex);
                });
            })
        }))
    }
}
Actions.prototype = Object.create(Action.prototype);
Actions.prototype.constructor = Actions;

function ActionManager() {

    var _actionMap = keyed(actions => actions.name()).collection();

    this.add = function (name, action, priority) {
        if (undefined === priority) priority = 0;
        var actions = _actionMap.getOrCreate(name, () => new Actions(name));
        actions.add(action, priority);
    }    

    this.do = function (name) {
        var args = [].slice.call(arguments);
        args.splice(0, 1);
        var action = _actionMap.getOrCreate(name, () => new Actions(name));
        return action.do.apply(action, args);
    }

    this.create = function (fn) {
        return {
            do: fn
        };
    };

    this.createManager = function () {
        return new ActionManager();
    };
}
module.exports = new ActionManager();