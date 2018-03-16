'use-strict';
const {
    Task,
    TaskBuilder
} = require('./base');

function CompleteTask(result) {
    Task.call(this);

    this.setCancellable = function () {
        throw new TypeError('Cancel is not supported by InstantCompleteTask');
    }

    this.isCancellable = function () {
        return false;
    }

    this.setPausable = function () {
        throw new TypeError('Pause is not supported by InstantCompleteTask');
    }

    this.isPausable = function () {
        return false;
    }

    this.setSkippable = function () {
        throw new TypeError('Skip is not supported by InstantCompleteTask');
    }

    this.isSkippable = function () {
        return false;
    }

    this.setTimeout = function () {
        throw new TypeError('Timeout is not supported by InstantCompleteTask');
    }

    this.onStart = function () {
        let task = this;
        process.nextTick(function () {
            task.complete(result);
        })
    }
}
CompleteTask.prototype = Object.create(Task.prototype);
CompleteTask.prototype.constructor = CompleteTask;

exports.complete = function (result) {
    return new TaskBuilder(new CompleteTask(result));
}

function ErrorTask(ex) {
    Task.call(this);

    this.setCancellable = function () {
        throw new TypeError('Cancel is not supported by ErrorTask');
    }

    this.isCancellable = function () {
        return false;
    }

    this.setPausable = function () {
        throw new TypeError('Pause is not supported by ErrorTask');
    }

    this.isPausable = function () {
        return false;
    }

    this.setSkippable = function () {
        throw new TypeError('Skip is not supported by ErrorTask');
    }

    this.isSkippable = function () {
        return false;
    }

    this.setTimeout = function () {
        throw new TypeError('Timeout is not supported by ErrorTask');
    }

    this.onStart = function () {
        let task = this;
        process.nextTick(function() {
            task.error(ex);
        });
    }
}
ErrorTask.prototype = Object.create(Task.prototype);
ErrorTask.prototype.constructor = ErrorTask;

exports.error = function (ex) {
    return new TaskBuilder(new ErrorTask(ex));
}