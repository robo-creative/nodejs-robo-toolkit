let isClass = function (candidate) {
    return typeof candidate === 'function' &&
        /^class\s/.test(Function.prototype.toString.call(candidate));
}

let getTypeName = function (object) {
    let typeName = typeof object;
    switch (typeName) {
        case 'function':
            return isClass(object) ? `class` : `function`;
        default:
            return typeName;
    }
}

const primitiveTypes = Object.freeze({
    'boolean': 'Boolean',
    'string': 'String',
    'number': 'Number',
    'symbol': 'Symbol'
});

let getClassName = function (type, obj) {
    if (type.isFunction) {
        return getFunctionName(obj);
    } else if (type.isObject) {
        return getObjectCtorName(obj);
    } else if (type.isPrimitive) {
        return primitiveTypes[type.name];
    }
    return '';
}

let getFunctionName = function (obj) {
    return obj.name || '';
}

let getObjectCtorName = function (obj) {
    return obj && obj.constructor && obj.constructor.name ? obj.constructor.name : 'Object';
}

function Type(obj) {
    this.name = getTypeName(obj);
    this.isClass = this.name === 'class';
    this.isFunction = this.isClass || this.name === 'function';
    this.isObject = this.name === 'object';
    this.isArray = Array.isArray(obj);
    this.isNumber = this.name === 'number';
    this.isBoolean = this.name === 'boolean';
    this.isString = this.name === 'string';
    this.isSymbol = this.name === 'symbol';
    this.isUndefined = this.name === 'undefined';

    this.isPrimitive = typeof primitiveTypes[this.name] !== 'undefined';
    this.isValue = this.isNumber || this.isBoolean || this.isString || this.isSymbol || this.isUndefined || (null === obj);
    this.class = getClassName(this, obj);

    this.toString = function () {
        return this.isFunction ? `${this.name} ${'' === this.class ? '[anonymous]' : this.class}` : this.class;
    }
}

exports.type = function (object) {
    return new Type(object);
}