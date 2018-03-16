const {
    collection
} = require('../../index');

let createClassInstance = function (type) {
    let boundConstructor = type.bind.apply(type, [null]);
    return new boundConstructor();
}

class SchemaCache {

    constructor() {
        this.items = collection.keyed(item => this.getCacheKey(item.type)).collection();
    }

    get(type, creationCallback) {
        creationCallback = creationCallback || function (type) {
            let properties = {};
            let classInstance = createClassInstance(type);
            for (let name in classInstance) {
                properties[name] = {
                    type: 'any'
                };
            }
            return {
                type,
                properties
            };
        };
        if (!this.items.hasKey(this.getCacheKey(type))) {
            this.add(creationCallback(type));
        }
        return this.items.get(this.getCacheKey(type));
    }

    add(schema) {
        this.items.add(schema);
    }

    getCacheKey(type) {
        return type.name;
    }
}

class Parser {

    constructor(schemaCache, validator) {
        this.schemaCache = schemaCache;
        this.validator = validator;
        this.valueConverters = {
            'boolean': source => ['false', 'False', 0, '0', false].indexOf(source) === -1,
            'string': source => `${source}`,
            'int': source => Number.parseInt(source),
            'integer': source => Number.parseInt(source),
            'number': source => Number.parseFloat(source),
            'float': source => Number.parseFloat(source),
            'symbol': source => Symbol(source)
        };
    }

    addSchema(schema) {
        this.schemaCache.add(schema);
    }

    parse(type, source, schema) {
        if (null === source || undefined === source) return source;
        if (typeof type === 'string') {
            switch (type) {
                case 'boolean':
                case 'string':
                case 'integer':
                case 'int':
                case 'number':
                case 'float':
                case 'symbol':
                    return this.valueConverters[type](source);
                case 'array':
                    let arr = [];
                    this.inflatArray(arr, source, schema);
                    return arr;
                default:
                    return source;
            }
        } else if (typeof type === 'function') {
            if (this.validator) this.validator.validate(schema, source);
            let instance = createClassInstance(type);
            this.inflatObject(type, instance, source, schema);
            return instance;
        } else {
            return source;
        }
    }

    inflatObject(type, target, source, schema) {
        if (typeof target.fillFrom === 'function')
            target.fillFrom(source);
        else {
            schema = schema || this.schemaCache.get(type);
            for (let propertyName in schema.properties) {
                let property = schema.properties[propertyName];
                let field = property.field || propertyName;
                let fieldValue = source.hasOwnProperty(field) ? source[field] : undefined;
                let pValue = fieldValue;
                if (fieldValue !== 'undefined' && null !== fieldValue) {
                    if (typeof property.parse === 'function') {
                        pValue = property.parse(fieldValue);
                    } else {
                        pValue = this.parse(property.type, fieldValue, property);
                    }
                }
                target[propertyName] = pValue;
            };
        }
    }

    inflatArray(array, source, schema) {
        if (!source || !source.length || !schema) return;
        let itemType = schema.items && schema.items.type ? schema.items.type : 'any';
        source.forEach(item => {
            array.push(this.parse(itemType, item, schema.items));
        });
    }
}

function ParserWrapper(parser) {

    this.parse = function(type, source, schema) {
        return parser.parse(type, source, schema);
    }
}

class ParserBuilder {

    withSchemas(schemas) {
        this.schemas = schemas;
        return this;
    }

    useValidator(validator) {
        this.validator = validator;
        return this;
    }

    build() {
        let parser = new Parser(new SchemaCache(), this.validator);
        if (this.schemas && this.schemas.length) {
            this.schemas.forEach(schema => {
                parser.addSchema(schema);
            })
        }
        return new ParserWrapper(parser);
    }
}

let parser = new Parser(new SchemaCache());

exports = module.exports = {
    builder: () => new ParserBuilder(),
    parse: (type, source, schema) => parser.parse(type, source, schema),
    addSchema: (schema) => {
        parser.addSchema(schema)
    },
    setValidator: validator => {
        parser.validator = validator;
    }
}