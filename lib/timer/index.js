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

class CountdownTimer {

    constructor(timeout) {
        this.timeout = Math.max(timeout, 0);
        this._handle = undefined;
        this._lastRun = undefined;
        this._events = event.createAggregator(-1);
        this._eventTokens = new CompositeToken();
        this.status = TimerStatus.STOPPED;
    }

    get isStopped() {
        return this.status === TimerStatus.STOPPED;
    }

    get isStarted() {
        return this.status === TimerStatus.STARTED;
    }

    get isPaused() {
        return this.status === TimerStatus.PAUSED;
    }

    get isDestroyed() {
        return this.status === TimerStatus.DESTROYED;
    }
    
    addListener(listener, priority) {
        return this._events.get(TimerEvent.TIMEOUT)
            .combineWith(this._eventTokens)
            .priority(priority)
            .add(listener);
    }

    doStart() {
        let timer = this;
        this.status = TimerStatus.STARTED;
        this._lastRun = Date.now();
        this._handle = setTimeout(function () {
            clearTimeout(timer._handle);
            if (timer.isStarted) {
                timer.status = TimerStatus.STOPPED;
                timer._events.get(TimerEvent.TIMEOUT).dispatch();
            }
        }, this.timeout);
        return true;
    }

    start () {
        if (!this.isStopped)
            return false;
        return this.doStart();
    }

    stop() {
        if (!this.isStarted && !this.isPaused)
            return false;
        this.status = TimerStatus.STOPPED;
        clearTimeout(this._handle);
        return true;
    }

    pause() {
        if (!this.isStarted) return false;
        let willTimeOut = this._lastRun + this.timeout;
        let remaining = willTimeOut - Date.now();
        if (remaining <= 0) {
            this.stop();
        } else {
            this.status = TimerStatus.PAUSED;
            this.timeout = remaining;
        }
        return true;
    }

    resume () {
        if (!this.isPaused) return false;
        return this.doStart();
    }

    destroy() {
        if (!this.isStopped) return false;
        this.status = TimerStatus.DESTROYED;
        this._eventTokens.destroy();
        this._eventTokens = undefined;
        this._events = undefined;
        this._handle = undefined;
        this._lastRun = undefined;
        return true;
    }
}

exports.countdown = timeout => new CountdownTimer(timeout);