var path = require('path');

module.exports = [{
    method: "GET",
    path: "/public/{public*}",
    config:{plugins:{sessions:{skip:false}}},
    handler: {
        directory: {
            path: path.join(__dirname, '../www/public')
        }
    }
}, {
    path:    '/',
    method:  'GET',
    handler: (request, reply) => {
        reply.view('static/index', {title: 'Home', user: request.auth.credentials});
    }
}, {
    path:    '/about',
    method:  'GET',
    handler: (request, reply) => {
        reply.view('static/about', {title: 'About', user: request.auth.credentials});
    }
}, {
    path:    '/contact',
    method:  'GET',
    handler: (request, reply) => {
        reply.view('static/contact', {title: 'Contact', user: request.auth.credentials});
    }
}, {
    path:    '/dev/v1/plugins',
    method:  'GET',
    handler: (request, reply) => {
        reply.view('static/dev/v1/plugins', {title: 'Developers - Plugins', user: request.auth.credentials});
    }
}, {
    path:    '/dev/v1/source',
    method:  'GET',
    handler: (request, reply) => {
        reply.view('static/dev/v1/source', {title: 'Developers - Source', user: request.auth.credentials});
    }
}, {
    path: "/login",
    method: "GET",
    handler: (request, reply) => {
        if (request.session.get("userid")) {
            reply.redirect('/');

        } else {
            reply.view('static/login', request.auth.credentials);
        }
    }
}, {
    path: "/logout",
    method: "GET",
    handler: (request, reply) => {
        request.session.clear();
        reply.redirect('/');
    }
}];
