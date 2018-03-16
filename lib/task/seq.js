'use-strict';
const {
    CompositeTask,
    TaskBuilder
} = require('./base');

function SequenceTask() {
    CompositeTask.call(this);

    let _currentIndex = -1;
    let _seq = this;
    let _lastChildResult = undefined;

    let _getNext = function () {
        ++_currentIndex;
        let children = _seq.getChildren();
        return _currentIndex < children.length ? children[_currentIndex] : undefined;
    }

    let _startNext = function () {
        let next = _getNext();
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
    let _children = [].slice.call(arguments);
    let _builder = new TaskBuilder(new SequenceTask());
    _children.forEach(function (task) {
        if (task instanceof TaskBuilder) task = task.task();
        _builder = _builder.add(task);
    });
    return _builder;
}