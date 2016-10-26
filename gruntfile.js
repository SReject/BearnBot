module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);
    grunt.initConfig({
        eslint: {
            options: {
                configFile: '.eslintrc',
                rulePaths: ['conf/rules']
            },
            target: ['*.js']
        }
    });
    grunt.registerTask('default', ['eslint']);
}
