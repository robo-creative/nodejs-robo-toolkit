'use-strict';
const event = require('../event');
const {
    CompositeToken
} = event;
const TimerStatus = Object.freeze({
    STARTED: 1,
    PAUSED: 2,
    STOPPED: 3,
    DESTROYED: 9
});
exports.TimerStatus = TimerStatus;

const TimerEvent = Object.freeze({
    TIMEOUT: 'timeout',
    ELAPSED: 'elapsed'
});
exports.TimerEvent = TimerEvent;

function CountdownTimer(timeout) {
    timeout = Math.max(timeout, 0);
    var _handle = undefined;
    var _lastRun = undefined;
    var _events = event.createAggregator(-1);
    var _eventTokens = new CompositeToken();
    var _status = TimerStatus.STOPPED;
    var _timer = this;

    this.getTimeout = function () {
        return timeout;
    }

    this.addListener = function (listener, priority) {
        return _events.get(TimerEvent.TIMEOUT)
            .combineWith(_eventTokens)
            .priority(priority)
            .add(listener);
    }

    this.getStatus = function () {
        return _status;
    }

    var _setStatus = function (value) {
        _status = value;
    }

    this.isStopped = function () {
        return _status === TimerStatus.STOPPED;
    }

    this.isStarted = function () {
        return _status === TimerStatus.STARTED;
    }

    this.isPaused = function () {
        return _status === TimerStatus.PAUSED;
    }

    this.isDestroyed = function () {
        return _status === TimerStatus.DESTROYED;
    }

    var _doStart = function () {
        _setStatus(TimerStatus.STARTED);
        _lastRun = Date.now();
        _handle = setTimeout(function () {
            clearTimeout(_handle);
            if (_timer.isStarted()) {
                _setStatus(TimerStatus.STOPPED);
                _events.get(TimerEvent.TIMEOUT).dispatch();
            }
        }, timeout);
        return true;
    }

    this.start = function () {
        if (!this.isStopped())
            return false;
        return _doStart();
    }

    this.stop = function () {
        if (!this.isStarted() && !this.isPaused())
            return false;
        _setStatus(TimerStatus.STOPPED);
        clearTimeout(_handle);
        return true;
    }

    this.pause = function () {
        if (!this.isStarted()) return false;
        var willTimeOut = _lastRun + timeout;
        var remaining = willTimeOut - Date.now();
        if (remaining <= 0) {
            this.stop();
        } else {
            _setStatus(TimerStatus.PAUSED);
            timeout = remaining;
        }
        return true;
    }

    this.resume = function () {
        if (!this.isPaused()) return false;
        return _doStart();
    }

    this.destroy = function () {
        if (!this.isStopped()) return false;
        _setStatus(TimerStatus.DESTROYED);
        _eventTokens.destroy();
        _eventTokens = undefined;
        _events = undefined;
        _handle = undefined;
        _lastRun = undefined;
        return true;
    }
};
exports.countdown = function (timeout) {
    return new CountdownTimer(timeout);
};