'use-strict';
const {
    CompositeToken
} = require('../event');
const {
    Task,
    TaskBuilder,
    TaskEvent
} = require('./base');

function RepeatTask(task, test, interval) {
    Task.call(this);
    if (task instanceof TaskBuilder) task = task.task();
    if (!task.isRestartable()) throw new Error('Cannot repeat a non-restartable task');
    let _tokens = new CompositeToken();
    let _handle = undefined;
    let _repeater = this;
    let _firstTime = true;

    let _scheduleNextStart = function () {
        _handle = setTimeout(function () {
            clearTimeout(_handle);
            if (_repeater.isStarted() && !task.start(_repeater.getArgs()))
                _repeater.error(new Error('Cannot start the inner task'));
        }, interval);
    }

    let _repeat = function () {
        if (!_repeater.isStarted()) return;
        let shouldRepeat = typeof test === 'function' ? test() : test;
        if (shouldRepeat) {
            if (_firstTime) {
                _firstTime = false;
                task.start(_repeater.getArgs());
            } else {
                _scheduleNextStart();
            }
        } else {
            _firstTime = true;
            _repeater.complete();
        }
    }

    this.setTimeout = function () {
        throw new TypeError('Timeout is not applicable for this task');
    }

    this.onStart = function () {
        _repeat();
    }

    this.onDestroy = function (all) {
        _tokens.destroy();
        _tokens = undefined;
        if (all) {
            task.destroy(all);
        }
    }

    this.onCancel = function () {
        clearTimeout(_handle);
    }

    this.onSkip = function () {
        clearTimeout(_handle);
    }

    this.onPause = function () {
        clearTimeout(_handle);
    }

    this.onResume = function () {
        _repeat();
    }

    _tokens.add(task.on(TaskEvent.COMPLETED, function () {
        _repeat();
    }));
    _tokens.add(task.on(TaskEvent.ERROR, function (e) {
        if (_repeater.isStarted())
            _repeater.error(e.args);
    }));
    _tokens.add(task.on(TaskEvent.SKIPPED, function () {
        if (_repeater.isStarted() || _repeater.isPaused())
            _repeater.skip();
    }));
    _tokens.add(task.on(TaskEvent.CANCELLED, function () {
        if (_repeater.isStarted() || _repeater.isPaused())
            _repeater.cancel();
    }));
}
RepeatTask.prototype = Object.create(Task.prototype);
RepeatTask.prototype.constructor = RepeatTask;

exports.while = function (task, test, interval) {
    interval = Math.max(interval || 0, 0);
    return new TaskBuilder(new RepeatTask(task, test, interval));
}

exports.until = function (task, test, interval) {
    return exports.while(task, ex => !test(ex), interval);
}

exports.forever = function (task, interval) {
    return exports.while(task, true, interval);
}

exports.limited = function (task, times, interval) {
    times = Math.max(times || 0, 0);
    if (times === 0) return exports.forever(task, interval);
    let current = -1;
    return exports.while(task, function () {
        return ++current < times;
    }, interval);
}