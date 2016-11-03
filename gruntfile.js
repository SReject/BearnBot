module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt);
    grunt.initConfig({
        eslint: {
            options: {
                configFile: '.eslintrc',
            },
            target: ['*.js']
        }
    });
    grunt.registerTask('default', ['eslint']);
};
