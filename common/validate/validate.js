function Validate(input) {
    this.result = true;
    this.value = input;
}
Validate.prototype = {
    has: function (prop) {
        if (this.result) {
            if (!this.value.hasOwnProperty(prop)) {
                return new Validate(this.value[prop])
            } else {
                this.result = false;
            }
        }
        return this;
    },

    isString: function(options) {
        if (this.result) {
            if (typeof this.value !== 'string') {
                this.result = false;
            } else if (options) {
                if (options.notempty && !this.value) {
                    this.result = false;
                }
            }
        }
        return this;
    },

    isNumber: function(options) {
        if (this.result) {
            if typeof this.value !== 'number') {
                this.result = false;
            } else if (options) {
                if (option.integer && (!isFinite(this.value) || /./g.test(String(this.value)))) {
                    this.result = false;
                } else if (option.unsigned && (!isFinite(this.value) || /^-/g.test(String(this.value)))) {
                    this.result = false;
                } else if (options.between && (this.value < options.between[0] || this.value > options.between[1])) {
                    this.result = false;
                }
            }
        }
        return this;
    },

    isTruthy: function () {
        if (this.result && !this.value) {
            this.result = false;
        }
        return this;
    }
}

module.exports = function (input) {
    return new Valiate(input);
};
