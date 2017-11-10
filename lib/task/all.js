'use-strict';
const {
    CompositeTask,
    TaskBuilder,
    TaskStatus
} = require('./base');

function ConcurrentTask() {
    CompositeTask.call(this);
    var _concurrent = this;

    this.onStart = function (args) {
        if (this.getSize() === 0)
            this.complete();
        else {
            var toStarts = this.getChildren().map(function (task) {
                return task;
            });            
            toStarts.forEach(function (task) {
                _concurrent.startChild(task, args);
            })
        }
    }

    this.onAdd = function (task) {
        if (this.getStatus() === TaskStatus.STARTED) {
            this.startChild(task, this.getArgs());
        } else if (this.getStatus() === TaskStatus.PAUSED) {
            this.getRunningTasks().push(task);
        }
    }

    this.onChildComplete = function () {
        if (this.getRunningTasks().length === 0 && this.getStatus() === TaskStatus.STARTED) {
            this.complete();
        }
    }
}
ConcurrentTask.prototype = Object.create(CompositeTask.prototype);
ConcurrentTask.prototype.constructor = ConcurrentTask;

exports.all = function () {
    var _children = [].slice.call(arguments);
    var _builder = new TaskBuilder(new ConcurrentTask());
    _children.forEach(function (task) {
        if (task instanceof TaskBuilder) task = task.task();
        _builder = _builder.add(task);
    });
    return _builder;
}