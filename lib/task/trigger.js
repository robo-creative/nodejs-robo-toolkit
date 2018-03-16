'use-strict';
const {
    CompositeToken,
    EventAggregator
} = require('../event');
const {
    Task,
    TaskBuilder,
    TaskEvent
} = require('./base');

function TriggerTask(target, event, task, wait) {
    Task.call(this);

    if (task instanceof TaskBuilder) task = task.task();
    if (!(task instanceof Task)) throw new TypeError('Invalid task');
    let _isTargetEventAgg = target instanceof EventAggregator;
    if (!_isTargetEventAgg && typeof target.on !== 'function')
        throw new TypeError('Invalid event target');
    if (!event) throw new TypeError('Event must be specified');
    let _tokens = new CompositeToken();
    this.setResultKey(task.getResultKey())
    let _trigger = this;

    let _startTask = function (payload) {
        if (_trigger.isStarted()) {
            task.start(payload);
            if (!wait && _trigger.isStarted())
                _trigger.complete();
        }
    }
    if (_isTargetEventAgg) {
        _tokens.add(target.get(event).add(function (payload) {
            _startTask(payload);
        }));
    } else {
        _tokens.add(target.on(event, function (payload) {
            _startTask(payload);
        }));
    }

    if (wait) {
        _tokens.add(task.on(TaskEvent.COMPLETED, function (e) {
            if (_trigger.isStarted())
                _trigger.complete(e.sender.getResult());
        }));
        _tokens.add(task.on(TaskEvent.ERROR, function (e) {
            if (_trigger.isStarted())
                _trigger.error(e.args);
        }));
        _tokens.add(task.on(TaskEvent.SKIPPED, function () {
            if (_trigger.isStarted())
                _trigger.skip();
        }))
    }

    this.isPausable = function () {
        return false;
    }

    this.setPausable = function () {
        throw new TypeError('Pause is not supported by TriggerTask');
    }

    this.onTimeout = function () {
        _tokens.destroy();
    }

    this.onCancel = function () {
        _tokens.destroy();
    }

    this.onSkip = function () {
        _tokens.destroy();
    }

    this.onDestroy = function (all) {
        _tokens.destroy();
        if (all) {
            task.destroy(all);
        }
    }
}
TriggerTask.prototype = Object.create(Task.prototype);
TriggerTask.prototype.constructor = TriggerTask;

exports.trigger = function (target, event, task) {
    return new TaskBuilder(new TriggerTask(target, event, task, false));
}

exports.triggerWait = function (target, event, task) {
    return new TaskBuilder(new TriggerTask(target, event, task, true));
}