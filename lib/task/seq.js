'use-strict';
const {
    CompositeTask,
    TaskBuilder
} = require('./base');

function SequenceTask() {
    CompositeTask.call(this);

    var _currentIndex = -1;
    var _seq = this;
    var _lastChildResult = undefined;

    var _getNext = function () {
        ++_currentIndex;
        var children = _seq.getChildren();
        return _currentIndex < children.length ? children[_currentIndex] : undefined;
    }

    var _startNext = function () {
        var next = _getNext();
        if (next) {
            if (!_seq.startChild(next, _lastChildResult))
                _startNext();
        } else {
            _seq.complete(_lastChildResult);
        }
    }

    this.onRemove = function (child, at) {
        if (at < _currentIndex) --_currentIndex;
    }

    this.onStart = function (args) {
        _lastChildResult = args;
        if (this.getSize() === 0)
            this.complete();
        else
            _startNext();
    }

    this.onChildComplete = function (child) {
        _lastChildResult = child.getResult();
        _startNext();
    }

}
SequenceTask.prototype = Object.create(CompositeTask.prototype);
SequenceTask.prototype.constructor = SequenceTask;

exports.seq = function () {
    var _children = [].slice.call(arguments);
    var _builder = new TaskBuilder(new SequenceTask());
    _children.forEach(function (task) {
        if (task instanceof TaskBuilder) task = task.task();
        _builder = _builder.add(task);
    });
    return _builder;
}