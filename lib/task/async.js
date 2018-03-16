'use-strict';
const {
    Task,
    TaskBuilder
} = require('./base');

function AsyncTask(fn) {
    Task.call(this);
    if (typeof fn !== 'function') throw new TypeError('fn must be a function');
    let _asyncTask = this;

    this.onStart = function (args) {
        process.nextTick(function () {
            fn(_asyncTask, args);
        })
    }
}
AsyncTask.prototype = Object.create(Task.prototype);
AsyncTask.prototype.constructor = AsyncTask;

module.exports.async = function (fn) {
    return new TaskBuilder(new AsyncTask(fn));
}