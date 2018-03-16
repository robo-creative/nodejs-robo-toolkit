'use-strict';
const {
    CompositeToken
} = require('../event');
const {
    Task,
    TaskBuilder,
    TaskEvent
} = require('./base');

function RetryTask(task, test, interval) {
    Task.call(this);
    if (typeof test !== 'function') throw new TypeError('Test must be a function that accepts an error');
    if (task instanceof TaskBuilder) task = task.task();
    if (!task.isRestartable()) throw new Error('Cannot retry a non-restartable task');
    let _tokens = new CompositeToken();
    let _handle = undefined;
    let _retrier = this;
    _retrier.setResultKey(task.getResultKey());

    let _scheduleNextStart = function () {
        _handle = setTimeout(function () {
            clearTimeout(_handle);
            if (_retrier.isStarted() && !task.start(_retrier.getArgs()))
                _retrier.error(new Error('Cannot start the inner task'));
        }, interval);
    }

    let _retry = function () {
        if (!_retrier.isStarted()) return;
        _scheduleNextStart();
    }

    this.setTimeout = function () {
        throw new TypeError('Timeout is not applicable for this RetryTask');
    }

    this.onStart = function (args) {
        task.start(args);
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

    this.onError = function () {
        clearTimeout(_handle);
    }

    this.onPause = function () {
        clearTimeout(_handle);
    }

    this.onResume = function () {
        _retry();
    }

    this.onSkip = function () {
        clearTimeout(_handle);
    }

    _tokens.add(task.on(TaskEvent.COMPLETED, function (e) {
        if (_retrier.isStarted())
            _retrier.complete(e.sender.getResult());
    }));
    _tokens.add(task.on(TaskEvent.ERROR, function (e) {
        if (_retrier.isStarted()) {
            if (typeof test !== 'function' || test(e.args))
                _retry();
            else
                _retrier.error(e.args);
        }
    }));
    _tokens.add(task.on(TaskEvent.SKIPPED, function () {
        if (_retrier.isStarted() || _retrier.isPaused())
            _retrier.skip();
    }));
    _tokens.add(task.on(TaskEvent.CANCELLED, function () {
        if (_retrier.isStarted() || _retrier.isPaused())
            _retrier.cancel();
    }));
}
RetryTask.prototype = Object.create(Task.prototype);
RetryTask.prototype.constructor = RetryTask;

exports.while = function (task, test, interval) {
    interval = Math.max(interval || 0, 0);
    return new TaskBuilder(new RetryTask(task, test, interval));
}

exports.until = function (task, test, interval) {
    return exports.while(task, ex => !test(ex), interval);
}

exports.forever = function (task, interval) {
    return exports.while(task, function () {
        return true;
    }, interval);
}

exports.limitedWhile = function (task, test, allowed, interval) {
    let _current = -1;
    allowed = Math.max(allowed || 0, 0);
    return exports.while(task, function (ex) {
        return test(ex) && (++_current < allowed);
    }, interval);
}

exports.limitedUntil = function (task, test, allowed, interval) {
    return exports.limitedWhile(task, ex => !test(ex), allowed, interval);
}

exports.limited = function (task, allowed, interval) {
    return exports.limitedWhile(task, function () {
        return true;
    }, allowed, interval);
}