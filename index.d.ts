export namespace container {

    function create(): Container;

    function bind(contract: any): ConcreteSpecification;

    function resolve(contract: any, identityMap: { [propName: string]: any }): any;

    function value(value: any): ValueWrapper;

    function createInstaller(namespace: string): ModuleInstaller;

    interface Container {

        bind(contract: any): ConcreteSpecification;

        resolve(contract: any, identityMap: { [propName: string]: any }): any;

        value(value: any): ValueWrapper;

        createInstaller(namespace: string): ModuleInstaller;
    }

    interface ValueWrapper {
        readonly value: any;
    }

    interface ConcreteSpecification {

        to(concrete: any): DependencySpecification;
    }

    interface DependencySpecification {

        use(...components: any[]): DependencySpecification;

        set(props: { [propName: string]: string | ValueWrapper }): DependencySpecification;

        asSingleton(): DependencySpecification;
    }

    interface ModuleInstaller {
        install(paths: Array<string>, verbose: boolean);
    }
}

export function scope(target?: any): scope.Scope;

export namespace scope {
    const global: Scope;

    interface Scope {
        get(key: string): any;
        set(key: string, value: any): void;
        delete(key: string): void;
        clear(): void;
    }
}

export namespace collection {
    function keyed<K, V>(keyFor: (value: V) => K): KeyedCollectionBuilder<K, V>;

    interface KeyedCollectionBuilder<K, V> {
        collection(): KeyedCollection<K, V>;
    }

    interface KeyedCollection<K, V> {

        add(item: V): boolean;

        addRange(...items: V[]): void;

        hasKey(key: K): boolean;

        has(value: V): boolean;

        get(key: K): V;

        getOrCreate(key: K, fn: () => V): V;

        addOrUpdate(item: V, fn: (o: V, n: V) => V): void;

        remove(item: V): boolean;

        removeKey(key: K): boolean;

        clear(): void;

        size(): number;

        sortKeys(fn: (k1: K, k2: K) => number): void;

        sort(fn: (v1: V, v2: V) => number): void;

        keys(): Array<K>;

        values(): Array<V>;

        copy(to: KeyedCollection, predicate: (item: V) => boolean): void;

        toArray(arr: Array<V>, predicate: (item: V) => boolean): Array<V>;

        every(predicate: (item: V) => boolean): boolean;

        forEach(fn: (value: V) => any);

        filter(fn: (value: V) => boolean);

        map(mapper: (value: V) => any): Array<V>;

        reduce(reducer: (p: V, c: V) => any): any;
    }
}

export namespace crypto {
    function md5(data: any): string;
}

export namespace event {

    const Priority: {
        HIGER: number;
        HIGEST: number;
        HIGH: number;
        LOW: number;
        LOWER: number;
        LOWEST: number;
        MEDIUM: number;
    };

    function createAggregator(historicalLimit: number): EventAggregator;

    const aggregator: EventAggregator;

    class SubscriptionToken {
        destroy(): void;
    }

    class CompositeToken extends SubscriptionToken {
        add(token: SubscriptionToken): void;
    }

    class EventAggregator {

        constructor(historicalLimit: number);

        get(name: number): SubscriptionBuilder;

        getHistoricalSize(): number;

        clearHistory(): void;

        setHistoricalLimit(limit: number): void;

        getHistoricalLimit(): number;
    }

    class SubscriptionBuilder {

        useStrategy(strategy: string): SubscriptionBuilder;

        nextTick(): SubscriptionBuilder;

        delay(duration: number): SubscriptionBuilder;

        sync(): SubscriptionBuilder;

        immediate(): SubscriptionBuilder;

        priority(value: number): SubscriptionBuilder;

        acceptHistorical(): SubscriptionBuilder;

        combineWith(token: CompositeToken): SubscriptionBuilder;

        add(listener: (args: any) => void): SubscriptionToken;

        dispatch(args: any, noListenersCallback?: () => void, enqueuedCallback?: () => void): void;

        deleteHistory(): void;

        historySize(): number;
    }

}

export namespace action {

    interface Action {
        apply(...args): Promise<void>;
    }

    interface ActionManager {

        add(name: string, action: Action, priority: number): void;

        create(fn: (...args) => Promise<void>): Action;

        apply(...args): Promise<void>;
    }

    function add(name: string, action: Action, priority: number): void;

    function create(fn: (...args) => Promise<void>): Action;

    function apply(name: string, ...args): Promise<void>;

    function createManager(): ActionManager;
}

export namespace filter {
    function add(name: string, filter: Filter, priority: number): void;

    function apply(name: string, request: any): Promise<any>;

    function create(apply: (request: any) => Promise<any>): Filter;

    function createManager(): FilterManager;

    interface Filter {
        apply(request: any): Promise<any>
    }

    interface FilterManager {
        add(name: string, filter: Filter, priority: number): void;

        apply(name: string, request: any): Promise<any>;

        create(apply: (request: any) => Promise<any>): Filter;
    }
}

export namespace guid {
    function v4(): string;
}

export namespace parser {

    function addSchema(schema: Schema): void;

    function builder(): ParserBuilder;

    function parse(type: any, source: any, schema: Schema): any;

    function setValidator(validator: SchemaValidator): void;

    interface Parser {
        parse(type: any, source: any, schema: Schema): any;
    }

    interface Schema {
        type: string;

        [propName: string]: any
    }

    interface SchemaValidator {

        validate(schema: Schema, source: any): void;
    }

    interface ParserBuilder {
        withSchemas(schemas: Array<Schema>): ParserBuilder;

        useValidator(validator: SchemaValidator): ParserBuilder;

        build(): Parser;
    }
}

export namespace reflect {
    function type(object: any): Type;

    interface Type {
        readonly name: string;
        readonly isClass: boolean;
        readonly isFunction: boolean;
        readonly isObject: boolean;
        readonly isArray: boolean;
        readonly isNumber: boolean;
        readonly isBoolean: boolean;
        readonly isString: boolean;
        readonly isSymbol: boolean;
        readonly isUndefined: boolean;

        readonly isPrimitive: boolean;
        readonly isValue: boolean;
        readonly class: string;

        toString(): string;
    }
}

export namespace spec {
    class Spec<T> {

        and<S extends Spec<T>>(spec: S): Spec<T>;

        isSatisfiedBy(candidate: T): boolean;

        not<S extends Spec<T>>(spec: S): Spec<T>;

        or<S extends Spec<T>>(spec: S): Spec<T>;
    }
}

export function spec<C, T extends spec.Spec<C>>(): T;

export namespace task {

    const TaskEvent: {
        CANCELLED: string;
        COMPLETED: string;
        ERROR: string;
        PAUSED: string;
        RESUMED: string;
        SKIPPED: string;
        STARTED: string;
        STATUS_CHANGED: string;
        TIMEOUT: string;
    };

    const TaskStatus: {
        COMPLETED: number;
        DESTROYED: number;
        NOT_STARTED: number;
        PAUSED: number;
        STARTED: number;
    };

    abstract class Task {

        getUid(): string;

        setUid(value: string): void;

        getName(): string;

        setName(value: string): void;

        on(event: string, listener: (args: any) => void, priority: number);

        getResult(): any;

        setResultKey(key: string): void;

        getResultKey(): string;

        getResultMap(): Map;

        setResultMap(map: Map): void;

        getStatus(): number;

        getParent(): CompositeTask;

        setParent(parent: CompositeTask): void;

        isRestartable(): boolean;

        setRestartable(value: boolean): void;

        isCancellable(): boolean;

        setCancellable(value: boolean): void;

        isPausable(): boolean;

        setPausable(value: boolean): void;

        isSkippable(): boolean;

        setSkippable(value: boolean): void;

        getTimeout(): number;

        setTimeout(value: number): void;

        isNotStarted(): boolean;

        isStarted(): boolean;

        isPaused(): boolean;

        isCompleted(): boolean;

        isDestroyed(): boolean;

        getArgs(): any;

        start(args: any, ignoreParent: boolean): boolean;

        pause(): boolean;

        resume(): boolean;

        cancel(): boolean;

        skip(): boolean;

        error(ex: any): boolean;

        complete(result: any): boolean;

        destroy(all: boolean): void;

        protected abstract onStart(args: any): void;

        protected abstract onCancel(): void;

        protected abstract onError(ex: any): void;

        protected abstract onPause(): void;

        protected abstract onResume(): void;

        protected abstract onSkip(): void;

        protected abstract onTimeout(): void;

        protected abstract onDestroy(all: boolean): void;

        toPromise(args: any): Promise<any>;
    }

    abstract class CompositeTask extends Task {

        isAutoStart(): boolean;

        setAutoStart(value: boolean): void;

        ignoresChildErrors(): boolean;

        setIgnoresChildErrors(value: boolean): void;

        getSize(): number;

        getRunningTasks(): Array<Task>;

        getChildren(): Array<Task>;

        add(task: Task): boolean;

        remove(task: Task): boolean;

        get(index: number): Task;

        protected abstract onAdd(task: Task): void;

        protected abstract onRemove(task: Task, at: number): void;

        protected abstract onChildComplete(child: Task): void;

        protected startChild(child: Task, args: any): boolean;

        protected completeChild(child: Task, skip: boolean): void;

        protected cancelChild(child: Task): void;

        protected errorChild(child: Task, ex: any): void;
    }

    class TaskBuilder {

        autoStart(value: boolean): TaskBuilder;

        name(value: string): TaskBuilder;

        cancellable(value: boolean): TaskBuilder;

        ignoresChildErrors(value: boolean): TaskBuilder;

        pausable(value: boolean): TaskBuilder;

        restartable(value: boolean): TaskBuilder;

        resultKey(key: string): TaskBuilder;

        resultMap(map: Map): TaskBuilder;

        skippable(value: boolean): TaskBuilder;

        timeout(milliseconds: number): TaskBuilder;

        on(event: string, listener: (args: any) => void, priority: number): TaskBuilder;

        add(child: Task): TaskBuilder;

        autoDestroy(all: boolean): TaskBuilder;

        task(): Task;

        start(args: any): Task;

        tokens(): event.CompositeToken;

        toPromise(args: any): Promise<any>;
    }

    function all(...args: (Task | TaskBuilder)[]): TaskBuilder;

    function async(fn: (task: Task, args?: any) => void): TaskBuilder;

    function complete(result: any): TaskBuilder;

    function delay(task: Task | TaskBuilder, milliseconds: number): TaskBuilder;

    function delayWait(task: Task | TaskBuilder, milliseconds: any): TaskBuilder;

    function error(ex: any): TaskBuilder;

    function seq(...args: (Task | TaskBuilder)[]): TaskBuilder;

    function trigger(target: event.EventAggregator | { on: (event: string, listener: (args: any) => void, priority: number) => void }, event: string, task: Task | TaskBuilder): TaskBuilder;

    function triggerWait(target: event.EventAggregator | { on: (event: string, listener: (args: any) => void, priority: number) => void }, event: string, task: Task | TaskBuilder): TaskBuilder;

    function when(proposition: any, then: Task | TaskBuilder, otherwise: Task | TaskBuilder): TaskBuilder;

    function whenWait(proposition: any, then: Task | TaskBuilder, otherwise: Task | TaskBuilder): TaskBuilder;

    namespace repeat {

        function forever(task: Task | TaskBuilder, interval: number): TaskBuilder;

        function limited(task: Task | TaskBuilder, times: number, interval: number): TaskBuilder;

        function until(task: Task | TaskBuilder, test: any, interval: number): TaskBuilder;
    }

    namespace retry {

        function forever(task: Task | TaskBuilder, interval: number): TaskBuilder;

        function limited(task: Task | TaskBuilder, times: number, interval: number): TaskBuilder;

        function limitedUntil(task: Task | TaskBuilder, test: (ex: any) => boolean, times: number, interval: number): TaskBuilder;

        function limitedWhile(task: Task | TaskBuilder, test: (ex: any) => boolean, times: number, interval: number): TaskBuilder;

        function until(task: Task | TaskBuilder, test: (ex: any) => boolean, interval: number): TaskBuilder;
    }
}

export namespace timer {

    const TimerEvent: {
        ELAPSED: string;
        TIMEOUT: string;
    };

    const TimerStatus: {
        DESTROYED: number;
        PAUSED: number;
        STARTED: number;
        STOPPED: number;
    };

    function countdown(timeout: number): CountdownTimer;

    interface CountdownTimer {
        getTimeout(): number;

        addListener(listener: (args: any) => void, priority: number): event.SubscriptionToken;

        getStatus(): number;

        isStopped(): boolean;

        isStarted(): boolean;

        isPaused(): boolean;

        isDestroyed(): boolean;

        start(): boolean;

        stop(): boolean;

        pause(): boolean;

        resume(): boolean;

        destroy(): boolean;
    }
}