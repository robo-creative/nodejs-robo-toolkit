'use-strict';
const {
    keyed
} = require('../collection');
const guid = require('../guid');

const Priority = Object.freeze({
    HIGEST: Number.MIN_SAFE_INTEGER,
    HIGER: -2,
    HIGH: -1,
    MEDIUM: 0,
    LOW: 1,
    LOWER: 2,
    LOWEST: Number.MAX_SAFE_INTEGER
});
exports.Priority = Priority;

function Event(name, history) {
    let _subscriptions = keyed(function (item) {
        return item.getToken().getUid();
    }).collection();

    this.getName = function () {
        return name;
    }

    let _publishHistorical = function (subscription) {
        let historical = history.get(name);
        historical.forEach(payload => {
            subscription.publish(payload);
        });
    }

    this.add = function (listener, priority, publicationStrategy, acceptHistorical) {
        let subscription = new Subscription(new SubscriptionToken(this), listener, publicationStrategy, priority);
        _subscriptions.add(subscription);
        if (acceptHistorical) {
            process.nextTick(() => {
                _publishHistorical(subscription);
            });
        }
        return subscription.getToken();
    }

    this.remove = function (token) {
        let subscription = _subscriptions.get(token.getUid());
        if (subscription) {
            subscription.destroy();
        }
        return _subscriptions.removeKey(token.getUid());
    }

    this.dispatch = function (payload, noListenersCallback, enqueuedCallback) {
        history.add(name, payload);
        let snapshot = _subscriptions.values();
        snapshot.sort((a, b) => a.getPriority() - b.getPriority());
        if (snapshot.length === 0) {
            if (typeof noListenersCallback === 'function') noListenersCallback();
        } else {
            if (typeof enqueuedCallback === 'function') enqueuedCallback();
            snapshot.forEach(item => {
                item.publish(payload);
            })
        }
    }

    this.deleteHistory = function () {
        history.delete(name);
    }

    this.historySize = function () {
        return history.size(name);
    }
}

function SubscriptionToken(event) {
    let _uid = guid.v4();

    this.getUid = function () {
        return _uid;
    }

    this.destroy = function () {
        event.remove(this);
    }
}

function CompositeToken() {
    SubscriptionToken.call(this);

    let _tokens = [];

    this.add = function (token) {
        if (_tokens.indexOf(token) === -1)
            _tokens.push(token);
    }

    this.destroy = function () {
        _tokens.forEach(function (token) {
            token.destroy();
        });
        _tokens = undefined;
    }
}
CompositeToken.prototype = Object.create(SubscriptionToken.prototype);
CompositeToken.prototype.constructor = CompositeToken;

exports.CompositeToken = CompositeToken;

function Subscription(token, listener, publicationStrategy, priority) {

    let _isDestroyed = false;

    this.getPriority = function () {
        return priority;
    }

    this.getToken = function () {
        return token;
    }

    this.publish = function (payload) {
        if (_isDestroyed) return;
        publicationStrategy.publish(listener, payload);
    }

    this.destroy = function () {
        _isDestroyed = true;
    }

    this.isDestroyed = function () {
        return _isDestroyed;
    }
}

function SyncPublicationStrategy() {
    this.publish = function (listener, payload) {
        listener(payload);
    }
}

function NextTickPublicationStrategy() {
    this.publish = function (listener, payload) {
        process.nextTick(() => {
            listener(payload);
        });
    }
}

function ImmedicatePublicationStrategy() {
    this.publish = function (listener, payload) {
        let handle = setImmediate(() => {
            clearImmediate(handle);
            listener(payload);
        })
    }
}

function DelayedPublicationStrategy(duration) {
    this.publish = function (listener, payload) {
        let handle = setTimeout(() => {
            clearTimeout(handle);
            listener(payload);
        }, duration);
    }
}

function SubscriptionBuilder(event) {

    let _pubStrategy = new SyncPublicationStrategy();
    let _priority = Priority.MEDIUM;
    let _acceptHistorical = false;
    let _tokens = undefined;

    this.useStrategy = function (strategy) {
        _pubStrategy = strategy || new SyncPublicationStrategy();
        return this;
    }

    this.nextTick = function () {
        _pubStrategy = new NextTickPublicationStrategy();
        return this;
    }

    this.delay = function (duration) {
        _pubStrategy = new DelayedPublicationStrategy(duration);
        return this;
    }

    this.sync = function () {
        _pubStrategy = new SyncPublicationStrategy();
        return this;
    }

    this.immediate = function () {
        _pubStrategy = new ImmedicatePublicationStrategy();
        return this;
    }

    this.priority = function (value) {
        _priority = value || Priority.MEDIUM;
        return this;
    }

    this.acceptHistorical = function () {
        _acceptHistorical = true;
        return this;
    }

    this.combineWith = function (tokens) {
        _tokens = tokens;
        return this;
    }

    this.add = function (listener) {
        let token = event.add(listener, _priority, _pubStrategy, _acceptHistorical);
        if (_tokens) {
            _tokens.add(token);
        }
        return token;
    }

    this.dispatch = function (payload, noListenersCallback, enqueuedCallback) {
        event.dispatch(payload, noListenersCallback, enqueuedCallback);
    }

    this.deleteHistory = function () {
        event.deleteHistory();
    }

    this.historySize = function () {
        return event.historySize();
    }
}

function EventHistory(limit) {
    let _all = [];

    let _compress = function () {
        if (limit > 0 && _all.length > limit) {
            _all.splice(0, _all.length - limit);
        }
    }

    this.add = function (event, payload) {
        if (limit === -1) return;
        _all.push({
            event,
            payload
        });
        _compress();
    }

    this.get = function (event) {
        return _all.filter(item => item.event === event).map(item => item.payload);
    }

    this.delete = function (event) {
        _all = _all.filter(element => element.event !== event);
    }

    this.clear = function () {
        _all = [];
    }

    this.size = function (event) {
        return event ? _all.reduce((p, c) => p + (c.event === event ? 1 : 0), 0) : _all.length;
    }

    this.setLimit = function (value) {
        if (limit !== value) {
            limit = value;
            _compress();
        }
    }

    this.getLimit = function () {
        return limit;
    }
}

function EventAggregator(historicalLimit) {

    if (undefined === historicalLimit) historicalLimit = -1;
    historicalLimit = Math.max(historicalLimit, -1);
    let _history = new EventHistory(historicalLimit);

    let _events = keyed(function (event) {
        return event.getName()
    }).collection();

    this.get = function (name) {
        let event = _events.getOrCreate(name, function () {
            return new Event(name, _history);
        });
        return new SubscriptionBuilder(event);
    }

    this.getHistoricalSize = function () {
        return _history.size();
    }

    this.clearHistory = function () {
        _history.clear();
    }

    this.setHistoricalLimit = function (limit) {
        limit = Math.max(limit, -1);
        _history.setLimit(limit);
    }

    this.getHistoricalLimit = function () {
        return _history.getLimit();
    }
}

exports.EventAggregator = EventAggregator;
exports.createAggregator = function (historicalLimit) {
    return new EventAggregator(historicalLimit);
};
exports.aggregator = new EventAggregator(-1);