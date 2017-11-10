
const { Task, CompositeTask, TaskBuilder, TaskEvent, TaskStatus } = require('./base');
const repeat = require('./repeat');
const retry = require('./retry');
const { async } = require('./async');
const { delay, delayWait } = require('./delay');
const { error, complete } = require('./instant');
const { trigger, triggerWait } = require('./trigger');
const { when, whenWait } = require('./when');
const { seq } = require('./seq');
const { all } = require('./all');

module.exports = {
    Task,
    CompositeTask,
    TaskBuilder,
    TaskEvent,
    TaskStatus,
    repeat,
    retry,
    async,
    delay,
    delayWait,
    error,
    complete,
    trigger,
    triggerWait,
    when,
    whenWait,
    seq,
    all
}
