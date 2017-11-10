var specFrom = function (spec) {
    if (spec instanceof Spec) return spec;
    if (typeof spec === 'function' && "" !== spec.name) return new(spec.bind.apply(spec, [null].concat([])))();
    throw new Error('spec must be either an instance of Spec or a generalization of Spec');
}

class Spec {

    and(spec) {
        return new AndSpec(this, specFrom(spec));
    }

    or(spec) {
        return new OrSpec(this, specFrom(spec));
    }

    not() {
        return new NotSpec(this);
    }

    isSatisfiedBy(candidate) {
        throw new Error('must be implemented in subclass');
    }
}

class AndSpec extends Spec {

    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }

    isSatisfiedBy(candidate) {
        return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
    }
}

class OrSpec extends Spec {

    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }

    isSatisfiedBy(candidate) {
        return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
    }
}

class NotSpec extends Spec {

    constructor(spec) {
        super();
        this.spec = spec;
    }

    isSatisfiedBy(candidate) {
        return !(this.spec.isSatisfiedBy(candidate));
    }
}

exports = module.exports = specFrom;
exports.Spec = Spec;