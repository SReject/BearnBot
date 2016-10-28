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
     * Checks if the instance's value is an object
     * @access public
     * @return {Validate}
     */
    isObject: function () {
        if (this.result && typeof this.value !== 'object') {
            this.result = false;
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
    }
}

/**
 * Exported wrapper function for creating a Validate instance
 * @access public
 * @param {varies} input
 * @returns {Validate}
 */
module.exports = function (input) {
    return new Validate(input);
};
