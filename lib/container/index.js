'use-strict';

const {
    type
} = require('../reflect');

function Container() {
    let descriptions = new Map();

    let getName = function (contract) {
        return typeof contract === 'function' ? contract.name : contract;
    }

    let getBuilder = function (name) {
        if (!descriptions.has(name)) throw new Error('Component [' + name + '] could not be found');
        return descriptions.get(name).builder;
    };

    this.bind = function (contract) {
        let name = getName(contract);
        if (name === "") throw new Error('Invalid contract');
        let description = {
            name: name
        };
        descriptions.set(name, description);
        return new ConcreteSpecification(description);
    };

    this.resolve = function (contract, identityMap) {
        if (contract instanceof ValueWrapper) {
            return contract.value;
        }
        let name = getName(contract);
        if (identityMap) {
            return undefined === identityMap[name] ? getBuilder(name).build(this, descriptions.get(name), identityMap) :
                identityMap[name]
        } else {
            return getBuilder(name).build(this, descriptions.get(name));
        }
    };

    this.value = function (value) {
        return new ValueWrapper(value);
    };
};

function ValueWrapper(value) {
    this.value = value;
};

function ConcreteSpecification(description) {

    this.to = function (concrete) {
        if (undefined === concrete || null === concrete) throw new Error('No concrete specified for [' + description.name + ']');
        if (typeof concrete === 'function') {
            if (type(concrete).isClass) {
                description.builder = new ClassBuilder(concrete);
            } else {
                description.builder = new MethodBuilder(concrete);
            }
        } else {
            description.builder = new WrapperBuilder(concrete);
        }
        return new DependencySpecification(description);
    }
};

function DependencySpecification(description) {
    this.use = function () {
        description.dependencies = [].slice.call(arguments);
        return this;
    };

    this.set = function (properties) {
        description.injectProperties = properties;
        return this;
    };

    this.asSingleton = function () {
        description.builder = new SingletonBuilder(description.builder);
        return this;
    }
};

function ComponentBuilder() {

    let buildDependencies = function (container, dependencies, identityMap) {
        let resolved = [];
        if (undefined !== dependencies) {
            dependencies.forEach(function (dependency) {
                resolved.push(container.resolve(dependency, identityMap));
            });
        }
        return resolved;
    };

    let injectProperties = function (container, component, properties, identityMap) {
        if (undefined === properties) return;
        for (let property in properties) {
            if (properties.hasOwnProperty(property))
                component[property] = container.resolve(properties[property], identityMap);
        };
    };

    this.build = function (container, description, identityMap) {
        let component = this.createComponent(buildDependencies(container, description.dependencies, identityMap));
        if (identityMap && identityMap.hasOwnProperty(description.name))
            identityMap[description.name] = component;
        injectProperties(container, component, description.injectProperties, identityMap);
        return component;
    };

    this.createComponent = function (dependencies) {
        return undefined;
    };
}

function WrapperBuilder(instance) {
    ComponentBuilder.call(this);

    this.build = function (container, description, identityMap) {
        return instance;
    }
};
WrapperBuilder.prototype = Object.create(ComponentBuilder.prototype);
WrapperBuilder.prototype.constructor = WrapperBuilder;

function ClassBuilder(ctor) {
    ComponentBuilder.call(this);

    this.createComponent = function (dependencies) {
        let boundConstructor = ctor.bind.apply(ctor, [null].concat(dependencies));
        return new boundConstructor();
    }
};
ClassBuilder.prototype = Object.create(ComponentBuilder.prototype);
ClassBuilder.prototype.constructor = ClassBuilder;

function MethodBuilder(fn) {
    ComponentBuilder.call(this);

    this.createComponent = function (dependencies) {
        return fn.apply(null, dependencies);
    }
};
MethodBuilder.prototype = Object.create(ComponentBuilder.prototype);
MethodBuilder.prototype.constructor = MethodBuilder;

function SingletonBuilder(inner) {
    ComponentBuilder.call(this);
    this.instance = undefined;

    this.build = function (container, description, identityMap) {
        if (undefined === this.instance) {
            this.instance = inner.build(container, description, identityMap);
        }
        return this.instance;
    }
};
SingletonBuilder.prototype = Object.create(ComponentBuilder.prototype);
SingletonBuilder.prototype.constructor = SingletonBuilder;

function Module(definition) {

    let isInstalled = false;

    let shouldInstall = function ($, verbose) {
        if (undefined === definition.meta.on || typeof definition.meta.on.installing !== 'function') {
            if (verbose)
                console.log(`Pre-installation Check NOT FOUND. Module will be installed.`)
            return true;
        } else {
            if (verbose)
                console.log(`Pre-installation Check FOUND.`)
            let shouldBeInstalled = definition.meta.on.installing($, definition.name, definition.path);
            if (verbose) {
                if (shouldBeInstalled) {
                    console.log('Pre-installation Check PASSED.')
                } else {
                    console.log('Pre-installation Check FAILED. Module will NOT be installed.');
                }
            }
            return shouldBeInstalled;
        }
    };

    let doInstall = function ($, verbose) {
        if (undefined !== definition.meta.install) {
            if (verbose)
                console.log(`Custom Installation found. Installing module using CUSTOM INSTALLATION.`)
            definition.meta.install($, definition.name, definition.path);
        } else {
            if (verbose)
                console.log('Installing module.')
            let binding = $.bind(definition.name).to(require(definition.payload));
            if (undefined !== definition.meta.use) {
                binding = binding.use.apply(binding, definition.meta.use);
            }
            if (undefined !== definition.meta.set) {
                binding = binding.set(definition.meta.set);
            }
            if (definition.meta.singleton) {
                binding = binding.asSingleton();
            }
        }
        if (verbose)
            console.log(`Module installed.`);
    };

    let onPostInstall = function ($, verbose) {
        if (undefined === definition.meta.on || typeof definition.meta.on.installed !== 'function') {
            if (verbose)
                console.log('Post-installation Check NOT FOUND. Checking skipped.')
            return;
        }
        if (verbose)
            console.log('Post-installation Check FOUND.')
        definition.meta.on.installed($, definition.name, definition.path);
        if (verbose)
            console.log('Post-installation Check COMPLETED.')
    };

    this.onAllInstalled = function ($, verbose) {
        if (!isInstalled) return;
        if (undefined === definition.meta.on || typeof definition.meta.on.allInstalled !== 'function') return;
        if (verbose)
            console.log(`Final Check for [${definition.name}] FOUND.`);
        definition.meta.on.allInstalled($, definition.name, definition.path);
        if (verbose)
            console.log(`Final Check PASSED.`);
    };

    this.install = function ($, verbose) {
        if (verbose) {
            console.log('--------------------------------')
            console.log(`Module [${definition.name}] at '${definition.path}'.`);
        }
        if (!shouldInstall($, verbose)) return;
        doInstall($, verbose);
        onPostInstall($, verbose);
        isInstalled = true;
    }
}

function ModuleInstaller($, ns) {

    let discoverModules = function (paths, verbose) {
        let found = new Map();
        let length = paths.length;
        while (length > 0) {
            let path = paths[--length];
            if (verbose)
                console.log(`Discovering under '${path}'`);
            discoverModulesInDir(found, path, null, verbose);
            if (verbose)
                console.log('------------');
        }
        return found;
    }

    let discoverModulesInDir = function (found, rootPath, parent, verbose) {
        let fs = require('fs'),
            path = require('path');
        fs.readdirSync(rootPath).forEach((name) => {
            let modulePath = path.join(rootPath, name);
            let stat = fs.statSync(modulePath);
            let moduleName = parent ? `${parent}.${name}` : name;
            if (stat.isDirectory()) {
                let moduleMetaPath = path.join(modulePath, 'meta.js');
                if (fs.existsSync(moduleMetaPath) && fs.statSync(moduleMetaPath).isFile()) {
                    if (verbose)
                        console.log(`Found [${moduleName}].`);
                    if (found.has(moduleName)) {
                        if (verbose)
                            console.log(`[${moduleName}] already exists and will be skipped.`);
                    } else {
                        let moduleMeta = require(moduleMetaPath);
                        if (!moduleMeta) throw new Error(`Invalid meta for [${moduleName}`);
                        let definition = {
                            name: typeof ns === 'string' ? `${ns}.${moduleName}` : moduleName,
                            path: modulePath,
                            meta: moduleMeta
                        };
                        let modulePayloadPath = path.join(modulePath, 'index.js');
                        if (fs.existsSync(modulePayloadPath) && fs.statSync(modulePayloadPath).isFile()) {
                            definition.payload = modulePayloadPath;
                        } else if (typeof definition.meta.install !== 'function') {
                            throw new Error(`Invalid payload for [${moduleName}]`);
                        }
                        found.set(moduleName, new Module(definition));
                    }
                }
                discoverModulesInDir(found, modulePath, moduleName, verbose);
            }
        });
    }

    let onAllInstalled = function (modules, verbose) {
        modules.forEach(module => {
            module.onAllInstalled($, verbose);
        })
    }

    this.install = function (paths, verbose) {
        if (verbose)
            console.log(`DISCOVERING MODULES`);
        let modules = Array.from(discoverModules(paths, verbose).values());
        if (verbose)
            console.log(`TOTAL ${modules.length} MODULE(S) IN ${paths.length} PATH(S).`)

        modules.forEach(module => {
            module.install($, verbose);
        })
        if (verbose) {
            console.log('--------------------------------')
            console.log(`All modules installed.`);
        }
        onAllInstalled(modules, verbose);
        if (verbose) {
            console.log('--------------------------------')
            console.log(`INSTALLATION COMPLETED`);
        }
    };
}

let createContainer = function () {
    let instance = function (contract, identityMap) {
        return instance.fn.r(contract, identityMap);
    };
    instance.fn = instance.prototype = new Container();
    instance.fn.r = function (contract, identityMap) {
        if (!contract) return this;
        return instance.resolve(contract, identityMap);
    };
    instance.bind = function (contract) {
        return instance.fn.bind(contract);
    };
    instance.resolve = function (contract, identityMap) {
        return instance.fn.resolve(contract, identityMap);
    };
    instance.value = function (value) {
        return instance.fn.value(value);
    };
    instance.createInstaller = function (ns) {
        return new ModuleInstaller(instance, ns);
    }
    return instance;
};

exports = module.exports = createContainer();
exports.create = createContainer;