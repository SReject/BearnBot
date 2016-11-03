var winston = require('winston');

/**
 * Exported wrapper function for creating a Validate instance
 * @access public
 * @param {varies} input
 * @returns {Validate}
 */
function validate(input) {
    return new Validate(input);
}

function hasOwnProp(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Constructor for easy input validation
 * @access private
 * @param {varies} input
 */
function Validate(input) {
    this.result = true;
    this.value = input;
}
Validate.prototype = {

    /**
     * Checks if the instance value has the specified property. If the property
     * exists, a new validate instance is created and returned for that
     * property's value. Otherwise the current validate instance is returned
     * @access public
     * @param {String} prop
     * @return {Validate}
     */
    has: function (prop) {
        if (this.result) {
            if (this.value.hasOwnProperty(prop)) {
                return new Validate(this.value[prop])
            } else {
                this.result = false;
            }
        }
        return this;
    },

    isBoolean: function () {
        if (this.result && typeof this.value !== 'boolean') {
            this.result = false;
        }
        return this;
    },

    /**
     * Checks if the instance's value is a number
     * @access public
     * @param {Object} options
     * @param {Number} options.integer
     * @param {Boolean} options.unsigned
     * @param {Array} options.between
     * @return {Validate}
     */
    isNumber: function (options) {
        if (this.result) {
            if (typeof this.value !== 'number') {
                this.result = false;

            } else if (options) {
                if (options.integer && (!isFinite(this.value) || /\./g.test(String(this.value)))) {
                    this.result = false;
                } else if (options.unsigned && (!isFinite(this.value) || /^-/g.test(String(this.value)))) {
                    this.result = false;
                } else if (options.between && (this.value < options.between[0] || this.value > options.between[1])) {
                    this.result = false;
                }
            }
        }
        return this;
    },

    /**
     * Checks if the instance's value is a string
     * @access public
     * @param {Object} options
     * @param {Boolean} options.notempty
     * @return {Validate}
     */
    isString: function (options) {
        if (this.result) {
            if (typeof this.value !== 'string') {
                this.result = false;
            } else if (options) {
                if (options.notempty && !this.value) {
                    this.result = false;
                } else if (options.match && !options.match.test(this.value)) {
                    this.result = false;
                }
            }
        }
        return this;
    },

    /**
     * Checks if the instance's value is an object
     * @access public
     * @return {Validate}
     */
    isObject: function (options) {
        options = options || {};
        var verbose = options.verbose || false;
        if (this.result) {
            if (typeof this.value !== 'object') {
                if (verbose) {
                    winston.info("[Validate/isObject] Input is not an object");
                }
                this.result = false;

            // handle options.contains
            } else if (hasOwnProp(options, 'contains') && options.contains.find((item) => {
                if (!hasOwnProp(this.value, item)) {
                    if (verbose) {
                        winston.info("[Validate/isObject/Contains] Value does not contain: " + item);
                    }
                    return true
                }
            })) {
                this.result = false;

            // handle options.containsonly
        } else if (hasOwnProp(options, 'containsonly') && Object.keys(this.value).find((key) => {
                if (options.containsonly.indexOf(key) === -1) {
                    if (verbose) {
                        winston.info("[Validate/isObject/ContainsOnly] Value contains illegal property: " + key);
                    }
                    return true;
                }
            })) {
                this.result = false;
            }
        }
        return this;
    },

    /**
     * Checks if the instance's value is truthy
     * @access public
     * @return {Validate}
     */
    isTruthy: function () {
        if (this.result && !this.value) {
            this.result = false;
        }
        return this;
    },


    isNot: function (options) {
        if (this.result) {
            var res = false;
            Object.keys(options).forEach((item) => {
                if (item === 'string') {
                    if (validate(this.value).isString(options.string).result) {
                        res = true;
                    }
                } else if (item === 'number') {
                    if (validate(this.value).isNumber(options.number).result) {
                        res = true;
                    }
                } else if (item === 'object') {
                    if (validate(this.value).isObject(options.object).result) {
                        res = true;
                    }
                }
            });
            this.result = !res;
        }
        return this;
    }
}
module.exports = validate;
