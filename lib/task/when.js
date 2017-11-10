'use-strict';
const {
    CompositeToken
} = require('../event');
const {
    Task,
    TaskBuilder,
    TaskEvent
} = require('./base');

function ConditionalTask(proposition, then, otherwise, wait) {
    Task.call(this);

    if (then instanceof TaskBuilder) then = then.task();
    if (!(then instanceof Task)) throw new TypeError('Invalid positive execution');

    if (otherwise instanceof TaskBuilder) otherwise = otherwise.task();
    if (otherwise && !(otherwise instanceof Task)) throw new TypeError('Invalid negative execution');

    var _tokens = new CompositeToken();
    if (wait) {
        var _task = this;
        _tokens.add(then.on(TaskEvent.COMPLETED, function (e) {
            if (_task.isStarted()) {
                if (!_task.getResultKey()) _task.setResultKey(e.sender.getResultKey());
                _task.complete(e.sender.getResult());
            }
        }));
        _tokens.add(then.on(TaskEvent.ERROR, function (e) {
            if (_task.isStarted()) {
                _task.error(e.args);
            }
        }));
        _tokens.add(then.on(TaskEvent.SKIPPED, function () {
            if (_task.isStarted()) {
                _task.skip();
            }
        }))

        if (otherwise) {
            _tokens.add(otherwise.on(TaskEvent.COMPLETED, function (e) {
                if (_task.isStarted()) {
                    if (!_task.getResultKey()) _task.setResultKey(e.sender.getResultKey());
                    _task.complete(e.sender.getResult());
                }
            }));
            _tokens.add(otherwise.on(TaskEvent.ERROR, function (e) {
                if (_task.isStarted())
                    _task.error(e.args);
            }));
            _tokens.add(otherwise.on(TaskEvent.SKIPPED, function () {
                if (_task.isStarted())
                    _task.skip();
            }))
        }
    }

    this.isPausable = function () {
        return false;
    }

    this.setPausable = function () {
        throw new TypeError('Pause is not supported by ConditionalTask');
    }

    this.onStart = function () {
        var satisfied = typeof proposition === 'function' ? proposition() : proposition;
        var taskToStart = satisfied ? then : otherwise;
        if (taskToStart) {
            if (taskToStart.start()) {
                if (!wait && this.isStarted()) this.complete();
            } else {
                this.error(new Error('Cannot start task'));
            }
        } else {
            this.complete();
        }
    }

    this.onDestroy = function (all) {
        _tokens.destroy();
        if (all) {
            then.destroy(all);
            if (otherwise) otherwise.destroy(all);
        }
    }

    this.onCancel = function () {
        _tokens.destroy();
    }

    this.onSkip = function () {
        _tokens.destroy();
    }

    this.onTimeout = function () {
        _tokens.destroy();
    }
}
ConditionalTask.prototype = Object.create(Task.prototype);
ConditionalTask.prototype.constructor = ConditionalTask;

exports.when = function (proposition, then, otherwise) {
    return new TaskBuilder(new ConditionalTask(proposition, then, otherwise, false));
}

exports.whenWait = function (proposition, then, otherwise) {
    return new TaskBuilder(new ConditionalTask(proposition, then, otherwise, true));
}