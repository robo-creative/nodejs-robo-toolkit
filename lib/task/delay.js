'use-strict';
const {
    CompositeToken
} = require('../event');
const {
    Task,
    TaskBuilder,
    TaskEvent
} = require('./base');

function DelayTask(task, milliseconds, wait) {
    Task.call(this);
    if (task instanceof TaskBuilder) task = task.task();
    var _handle = undefined;
    var _tokens = new CompositeToken();
    this.setResultKey(task.getResultKey());
    var _delayer = this;

    var _scheduleStart = function () {
        _handle = setTimeout(function () {
            clearTimeout(_handle);
            if (_delayer.isStarted()) {
                if (task.start(_delayer.getArgs())) {                    
                    if (!wait && _delayer.isStarted()) _delayer.complete();
                } else {
                    _delayer.error(new Error('Cannot start the inner task.'));
                }
            }
        }, milliseconds);
    }

    this.onStart = function () {
        _scheduleStart();
    }

    this.onDestroy = function (all) {
        _tokens.destroy();
        _tokens = null;
        if (undefined !== _handle)
            clearTimeout(_handle);
        if (all) {
            task.destroy(all);
        }
    }

    this.isPausable = function () {
        return false;
    }

    this.setPausable = function () {
        throw new TypeError('DelayTask cannot be paused');
    }

    this.onCancel = function () {
        clearTimeout(_handle);
    }

    this.onError = function () {
        clearTimeout(_handle);
    }

    this.onSkip = function () {
        clearTimeout(_handle);
    }

    if (wait) {
        _tokens.add(task.on(TaskEvent.COMPLETED, function (e) {
            if (_delayer.isStarted())
                _delayer.complete(e.sender.getResult());
        }));
        _tokens.add(task.on(TaskEvent.ERROR, function (e) {
            if (_delayer.isStarted())
                _delayer.error(e.args);
        }));
        _tokens.add(task.on(TaskEvent.SKIPPED, function () {
            if (_delayer.isStarted())
                _delayer.skip();
        }));
        _tokens.add(task.on(TaskEvent.CANCELLED, function () {
            if (_delayer.isStarted())
                _delayer.cancel();
        }));
    }
}
DelayTask.prototype = Object.create(Task.prototype);
DelayTask.prototype.constructor = DelayTask;

exports.delay = function (task, milliseconds) {
    milliseconds = Math.max(milliseconds || 0, 0);
    return new TaskBuilder(new DelayTask(task, milliseconds, false));
}

exports.delayWait = function (task, milliseconds) {
    milliseconds = Math.max(milliseconds || 0, 0);
    return new TaskBuilder(new DelayTask(task, milliseconds, true));
}