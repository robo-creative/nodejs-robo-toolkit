'use strict';

const {
    keyed
} = require('../collection');

class Actions {
    
    constructor(name) {
        this._actions = [];
        this.name = name;
    }

    add (action, priority) {
        this._actions.push({
            action,
            priority
        });
        this._actions = this._actions.sort((a, b) => a.priority - b.priority);
    }

    async apply() {
        let args = [].slice.call(arguments);
        return Promise.all(this._actions.map(item => {
            return new Promise((resolve, reject) => {
                item.action.apply.apply(item.action, args).then(() => {
                    resolve();
                }).catch(ex => {
                    reject(ex);
                });
            })
        }))
    }
}

class ActionManager {

    constructor() {
        this._actionMap = keyed(actions => actions.name()).collection();
    }
    
    add(name, action, priority) {
        if (undefined === priority) priority = 0;
        let actions = this._actionMap.getOrCreate(name, () => new Actions(name));
        actions.add(action, priority);
    }    

    async apply (name) {
        let args = [].slice.call(arguments);
        args.splice(0, 1);
        let action = this._actionMap.getOrCreate(name, () => new Actions(name));
        return action.apply.apply(action, args);
    }

    create(fn) {
        return {
            apply: fn
        };
    };

    createManager() {
        return new ActionManager();
    };
}
module.exports = new ActionManager();