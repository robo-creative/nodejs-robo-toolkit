'use-strict';
const event = require('../event');
const {
    CompositeToken,
    Priority
} = event;
const {
    countdown,
    TimerStatus
} = require('../timer');
const guid = require('../guid');
const TaskStatus = Object.freeze({
    NOT_STARTED: 0,
    STARTED: 1,
    PAUSED: 2,
    COMPLETED: 3,
    DESTROYED: 9
});
exports.TaskStatus = TaskStatus;

if (!Array.prototype.remove) {
    Array.prototype.remove = function (item) {
        var index = this.indexOf(item);
        if (index === -1) return false;
        this.splice(index, 1);
        return true;
    }
}

const TaskEvent = Object.freeze({
    STARTED: 'started',
    STATUS_CHANGED: 'status-changed',
    PAUSED: 'paused',
    RESUMED: 'resumed',
    SKIPPED: 'skipped',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ERROR: 'error',
    TIMEOUT: 'timeout'
});
exports.TaskEvent = TaskEvent;

function Task() {

    var _name = undefined;
    var _status = TaskStatus.NOT_STARTED;
    var _canRestart = true;
    var _canCancel = true;
    var _canPause = true;
    var _canSkip = true;

    var _timeout = -1;
    var _timer;
    var _resultMap = undefined;
    var _parent = undefined;
    var _events = event.createAggregator();
    var _eventTokens = new CompositeToken();
    var _uid = guid.v4();
    var _result = undefined;
    var _resultKey = _uid;
    var _task = this;
    var _args = undefined;

    this.getUid = function () {
        return _uid;
    }

    this.getName = function () {
        return _name || _uid;
    }

    this.setName = function (value) {
        _name = value;
    }

    this.on = function (event, listener, priority) {
        return _events.get(event)
            .priority(priority)
            .combineWith(_eventTokens)
            .add(listener);
    }

    this.getResult = function () {
        return _result;
    }

    this.dispatch = function (event, args) {
        _events.get(event).dispatch({
            sender: this,
            args: args
        });
    }

    this.setResultKey = function (value) {
        _resultKey = value;
    }

    this.getResultKey = function () {
        return _resultKey;
    }

    this.getResultMap = function () {
        if (undefined === _resultMap) {
            if (_parent)
                return _parent.getResultMap();
            else
                return undefined;
        } else {
            return _resultMap;
        }
    }

    this.setResultMap = function (map) {
        if (_status !== TaskStatus.NOT_STARTED) {
            this.warn('Cannot set result map to a running task');
            return;
        }
        _resultMap = map;
    }

    this.getStatus = function () {
        return _status;
    }

    var _setStatus = function (value) {
        if (value !== _status) {
            _status = value;
            _task.dispatch(TaskEvent.STATUS_CHANGED, _status);
        }
    }

    this.getParent = function () {
        return _parent;
    }

    this.setParent = function (value) {
        if (!value && !_parent) {
            this.warn('Cannot set parent for a task that belongs to another task');
            return;
        }
        _parent = value;
    }

    this.isRestartable = function () {
        return _canRestart;
    }

    this.setRestartable = function (value) {
        _canRestart = value;
        if (_canRestart && _status === TaskStatus.COMPLETED)
            _status = TaskStatus.NOT_STARTED;
    }

    this.isCancellable = function () {
        return _canCancel;
    }

    this.setCancellable = function (value) {
        _canCancel = value;
    }

    this.isPausable = function () {
        return _canPause;
    }

    this.setPausable = function (value) {
        _canPause = value;
    }

    this.isSkippable = function () {
        return _canSkip;
    }

    this.setSkippable = function (value) {
        _canSkip = value;
    }

    this.getTimeout = function () {
        return _timeout;
    }

    this.setTimeout = function (value) {
        if (_status === TaskStatus.STARTED) {
            this.warn('Cannot set timeout for a running task');
            return;
        }
        _timeout = Math.max(value, 0);
    }

    this.isNotStated = function () {
        return _status === TaskStatus.NOT_STARTED || (_status === TaskStatus.COMPLETED && this.isRestartable());
    }

    this.isStarted = function () {
        return _status === TaskStatus.STARTED;
    }

    this.isPaused = function () {
        return _status === TaskStatus.PAUSED;
    }

    this.isCompleted = function () {
        return _status === TaskStatus.COMPLETED;
    }

    this.isDestroyed = function () {
        return _status === TaskStatus.DESTROYED;
    }

    this.getArgs = function () {
        return _args;
    }

    this.start = function (args, ignoreParent) {
        if (!ignoreParent && _parent) {
            this.warn('Cannot start a child task directly');
            return false;
        }
        if (_status === TaskStatus.COMPLETED && this.isRestartable())
            _status = TaskStatus.NOT_STARTED;
        if (_status !== TaskStatus.NOT_STARTED) {
            this.warn('Cannot start a task when it is already running');
            return false;
        }
        _setStatus(TaskStatus.STARTED);
        _startTimer();
        _args = args;
        this.dispatch(TaskEvent.STARTED);
        this.onStart(args);
        return true;
    }

    this.pause = function () {
        if (!_canPause) {
            this.warn('Cannot suspend an unsuspendable task');
            return false;
        }
        if (!this.isStarted()) {
            this.warn('Cannot start an already-running task');
            return false;
        }
        _setStatus(TaskStatus.PAUSED);
        _pauseTimer();
        this.dispatch(TaskEvent.PAUSED);
        this.onPause();
        return true;
    }

    this.resume = function () {
        if (!this.isPaused()) {
            this.warn('Cannot resume an unsuspended task');
            return false;
        }
        if (_parent && _parent.isPaused()) {
            this.warn('Cannot resume a child task directly');
            return false;
        }
        _setStatus(TaskStatus.STARTED);
        _resumeTimer();
        this.dispatch(TaskEvent.RESUMED);
        this.onResume();
        return true;
    }

    this.cancel = function () {
        if (!_canCancel) {
            this.warn('Cannot cancel an uncancelable task');
            return false;
        }
        if (!this.isStarted() && !this.isPaused()) {
            this.warn('Cannot cancel an inactive task');
            return false;
        }
        _destroyTimer();
        _setStatus(TaskStatus.COMPLETED);
        if (_parent && !_parent.isCancelling())
            _parent.cancelChild(this);
        else {
            this.dispatch(TaskEvent.CANCELLED);
            this.onCancel();
        }
        return true;
    }

    this.skip = function () {
        if (!_canSkip) {
            this.warn('Cannot skip an unskipable task');
            return false;
        }
        if (!this.isStarted() && !this.isPaused()) {
            this.warn('Cannot skip an inactive task');
            return false;
        }
        _destroyTimer();
        _setStatus(TaskStatus.COMPLETED);
        if (_parent && !_parent.isCancelling())
            _parent.completeChild(this, true);
        else {
            this.dispatch(TaskEvent.SKIPPED);
            this.onSkip();
        }
        return true;
    }

    this.error = function (ex) {
        if (!this.isStarted()) {
            this.warn('Cannot flag an inactive task as error');
            return false;
        }
        _destroyTimer();
        _setStatus(TaskStatus.COMPLETED);
        if (_parent)
            _parent.errorChild(this, ex);
        else {
            this.dispatch(TaskEvent.ERROR, ex);
            this.onError(ex);
        }
        return true;
    }

    this.complete = function (result) {
        if (!this.isStarted()) {
            this.warn('Cannot flag a not-started task as completed');
            return false;
        }
        if (undefined !== result) {
            _result = result;
            if (_resultKey) {
                var resultMap = this.getResultMap();
                if (resultMap) resultMap.set(_resultKey, result);
            }
        }
        _destroyTimer();
        _setStatus(TaskStatus.COMPLETED);
        if (_parent)
            _parent.completeChild(this, false);
        else {
            this.dispatch(TaskEvent.COMPLETED);
        }
        return true;
    }

    this.destroy = function (all) {
        if (_status !== TaskStatus.NOT_STARTED && _status !== TaskStatus.COMPLETED) {
            this.warn('Cannot destroy a running task');
            return false;
        }
        _destroyTimer();
        _setStatus(TaskStatus.DESTROYED);
        this.onDestroy(all);
        _name = undefined;
        _timeout = -1;
        if (_resultMap) _resultMap.clear();
        _resultMap = undefined;
        if (_parent) _parent.remove(this);
        _parent = undefined;
        _eventTokens.destroy();
        _eventTokens = undefined;
        _events = undefined;
        _uid = undefined;
        _result = undefined;
        _resultKey = undefined;
    }

    var _startTimer = function () {
        if (_timeout >= 0) {
            if (!_timer) {
                _timer = countdown(_timeout);
                _timer.addListener(function () {
                    if (!_task.isStarted()) {
                        _task.warn('Cannot flag a not-started task as timed out');
                        return;
                    }
                    _task.dispatch(TaskEvent.TIMEOUT);
                    _task.onTimeout();
                    _task.error('Task [' + _task.getName() + '] timed out');
                });
            }
            _timer.start();
        }
    }

    var _pauseTimer = function () {
        if (_timer && _timer.getStatus() === TimerStatus.STARTED)
            _timer.pause();
    }

    var _resumeTimer = function () {
        if (_timer && _timer.getStatus() === TimerStatus.PAUSED)
            _timer.resume();
    }

    var _destroyTimer = function () {
        if (!_timer) return;
        _timer.stop();
        _timer.destroy();
        _timer = undefined;
    }

    this.onStart = function (args) {

    }

    this.onCancel = function () {

    }

    this.onError = function (ex) {

    }

    this.onPause = function () {

    }

    this.onResume = function () {

    }

    this.onSkip = function () {

    }

    this.onTimeout = function () {

    }

    this.onDestroy = function (all) {

    }

    this.warn = function (message) {
        console.log('[TASK][' + this.getName() + '] ' + message);
    }

    this.toPromise = function (args) {
        var task = this;
        return new Promise(function (resolve, reject) {
            var completedToken = task.on(TaskEvent.COMPLETED, function (e) {
                completedToken.destroy();
                resolve(e.sender.getResult());
            }, Priority.LOW);

            var errorToken = task.on(TaskEvent.ERROR, function (e) {
                errorToken.destroy();
                reject(e.args);
            }, Priority.LOW);

            task.start(args);
        })
    }
}
exports.Task = Task;

function CompositeTask() {
    Task.call(this);

    var _children = [];
    var _runningTasks = [];
    var _isCancelling = false;
    var _autoStart = false;
    var _ignoresChildErrors = false;

    var _canRestart = true;
    var _canCancel = true;
    var _canPause = true;
    var _canSkip = true;

    this.isCancellable = function () {
        if (!_canCancel)
            return false;
        else {
            return _children.every(function (task) {
                return task.isCancellable();
            })
        }
    }

    this.setCancellable = function (value) {
        _canCancel = value;
    }

    this.isPausable = function () {
        if (!_canPause)
            return false;
        else {
            return _children.every(function (task) {
                return task.isPausable();
            })
        }
    }

    this.setPausable = function (value) {
        _canPause = value;
    }

    this.isRestartable = function () {
        if (!_canRestart)
            return false;
        else {
            return _children.every(function (task) {
                return task.isRestartable();
            })
        }
    }

    this.setRestartable = function (value) {
        _canRestart = value;
    }

    this.isSkippable = function () {
        if (!_canSkip)
            return false;
        else {
            return _children.every(function (task) {
                return task.isSkippable();
            })
        }
    }

    this.setSkippable = function (value) {
        _canSkip = value;
    }

    this.isCancelling = function () {
        return _isCancelling;
    }

    this.isAutoStart = function () {
        return _autoStart;
    }

    this.setAutoStart = function (value) {
        if (_autoStart !== value) {
            _autoStart = value;
            if (_autoStart && this.isNotStated() && this.getSize() > 0)
                this.start();
        }
    }

    this.ignoresChildErrors = function () {
        return _ignoresChildErrors;
    }

    this.setIgnoresChildErrors = function (value) {
        _ignoresChildErrors = value;
    }

    this.getSize = function () {
        return _children.length;
    }

    this.getRunningTasks = function () {
        return _runningTasks;
    }

    this.getChildren = function () {
        return _children;
    }

    this.add = function (task) {
        if (!(task instanceof Task)) throw new TypeError('Child task must be an implementation of Task');
        if (task.isStarted()) {
            this.warn('Cannot add a running task to this task');
            return false;
        }
        if (task.isCompleted() && !task.isRestartable()) {
            this.warn('Cannot add a completed task to this task');
            return false;
        }
        if (task.getParent()) {
            this.warn('Cannot add a child task that belongs to another task');
            return false;
        }
        task.setParent(this);
        _children.push(task);
        this.onAdd(task);
        if (this.isAutoStart() && this.getStatus() === TaskStatus.NOT_STARTED)
            this.start();
        return true;
    }

    var _tryRemoveFromRunning = function (task) {
        var isTaskRunning = _runningTasks.remove(task);
        if (!isTaskRunning) return false;
        return true;
    }

    this.remove = function (task) {
        var isTaskRunning = _tryRemoveFromRunning(task);
        var at = _children.indexOf(task);
        if (at === -1) return false;
        _children.remove(task);
        task.setParent(undefined);
        this.onRemove(task, at);
        if (isTaskRunning && (this.isPaused() || this.isStarted()))
            this.onChildComplete(task);
        return true;
    }

    this.get = function (index) {
        if (index < 0 || index >= _children.length) throw new Error('Index out of range');
        return _children[index];
    }

    this.onAdd = function (task) {

    }

    this.onRemove = function (task, at) {

    }

    this.onChildComplete = function (child) {

    }

    this.onPause = function () {
        for (var i = 0; i < _runningTasks.length; i++) {
            var task = _runningTasks[i];
            if (!task.isPaused()) {
                if (!task.pause()) {
                    this.warn('Cannot pause child task: ' + task.getName());
                    this.remove(task);
                }
            }
        }
    }

    this.onResume = function () {
        if (_runningTasks.length === 0) {
            this.complete();
            return;
        }
        for (var i = 0; i < _runningTasks.length; i++) {
            var task = _runningTasks[i];
            if (task.isNotStated()) {
                this.startChild(task, task.getArgs());
            } else if (!task.resume()) {
                this.warn('Cannot resume child task: ' + task.getName());
                this.remove(task);
            }
        }
    }

    this.onCancel = function () {
        _isCancelling = true;
        for (var i = 0; i < _runningTasks.length; i++) {
            var task = _runningTasks[i];
            if (!task.cancel()) {
                this.warn('Cannot cancel child task: ' + task.getName());
                this.remove(task);
            }
        }
        _isCancelling = false;
        _runningTasks = [];
    }

    this.onSkip = function () {
        _isCancelling = true;
        for (var i = 0; i < _runningTasks.length; i++) {
            var task = _runningTasks[i];
            if (!task.skip()) {
                this.warn('Cannot skip child task: ' + task.getName());
                this.remove(task);
            }
        }
        _isCancelling = false;
        _runningTasks = [];
    }

    this.onError = function () {
        this.onCancel();
    }

    this.onTimeout = function () {
        this.onCancel();
    }

    this.onDestroy = function (all) {
        if (all) {
            _children.forEach(function (task) {
                task.destroy();
            });
        }
        _children = undefined;
        _runningTasks = undefined;
    }

    this.startChild = function (child, args) {
        if (_runningTasks.indexOf(child) === -1)
            _runningTasks.push(child);
        if (!child.start(args, true)) {
            this.warn('Cannot start child task: ' + child.getName());
            this.remove(child);
            return false;
        }
        return true;
    }

    this.completeChild = function (child, skip) {
        if (!_tryRemoveFromRunning(child))
            return;
        if (!this.isStarted()) return;

        if (skip) {
            child.dispatch(TaskEvent.SKIPPED);
            child.onSkip();
        } else {
            child.dispatch(TaskEvent.COMPLETED);
        }
        this.onChildComplete(child);
        if (this.isAutoStart() || !child.isRestartable()) {
            this.remove(child);
        }
    }

    this.cancelChild = function (child) {
        if (!_tryRemoveFromRunning(child))
            return;
        if (!this.isStarted() && !this.isPaused())
            return;

        child.dispatch(TaskEvent.CANCELLED);
        child.onCancel();
        this.onChildComplete(child);
        if (this.isAutoStart() || !child.isRestartable()) {
            this.remove(child);
        }
    }

    this.errorChild = function (child, ex) {
        if (!_tryRemoveFromRunning(child))
            return;

        if (!this.isStarted()) {
            return;
        }
        child.dispatch(TaskEvent.ERROR);
        child.onError(ex);
        if (_ignoresChildErrors)
            this.onChildComplete(child);
        else
            this.error(ex);
        if (this.isAutoStart() || !child.isRestartable()) {
            this.remove(child);
        }
    }
}
CompositeTask.prototype = Object.create(Task.prototype);
CompositeTask.prototype.constructor = CompositeTask;
exports.CompositeTask = CompositeTask;


function TaskBuilder(task) {

    var _eventTokens = new CompositeToken();

    this.autoStart = function (value) {
        if (undefined === value) value = true;
        task.setAutoStart(value);
        return this;
    }

    this.name = function (value) {
        task.setName(value);
        return this;
    }

    this.cancellable = function (value) {
        if (undefined === value) value = true;
        task.setCancellable(value);
        return this;
    }

    this.ignoresChildErrors = function (value) {
        if (undefined === value) value = true;
        task.setIgnoresChildErrors(value);
        return this;
    }

    this.pausable = function (value) {
        if (undefined === value) value = true;
        task.setPausable(value);
        return this;
    }

    this.restartable = function (value) {
        if (undefined === value) value = true;
        task.setRestartable(value);
        return this;
    }

    this.resultKey = function (value) {
        task.setResultKey(value);
        return this;
    }

    this.resultMap = function (value) {
        task.setResultMap(value);
        return this;
    }

    this.skippable = function (value) {
        task.setSkippable(value);
        return this;
    }

    this.timeout = function (value) {
        task.setTimeout(value);
        return this;
    }

    this.on = function (event, listener, priority) {
        _eventTokens.add(task.on(event, listener, priority));
        return this;
    }

    this.add = function (child) {
        if (child instanceof TaskBuilder) child = child.task();
        if (task instanceof CompositeTask)
            task.add(child);
        else
            throw new TypeError('Cannot add child to an incomposite task');
        return this;
    }

    this.autoDestroy = function (all) {
        this
            .on(TaskEvent.COMPLETED, function () {
                task.destroy(all);
            }, Priority.LOWEST)
            .on(TaskEvent.ERROR, function () {
                task.destroy(all);
            }, Priority.LOWEST)
            .on(TaskEvent.SKIPPED, function () {
                task.destroy(all);
            }, Priority.LOWEST);
        return this;
    }

    this.task = function () {
        return task;
    }

    this.start = function (args) {
        task.start(args);
        return task;
    }

    this.tokens = function () {
        return _eventTokens;
    }

    this.toPromise = function (args) {
        return task.toPromise(args);
    }
}
exports.TaskBuilder = TaskBuilder;