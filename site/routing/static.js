module.exports = function (server, config) {
    server.route({
        method: "GET",
        path: "/",
        handler: (request, reply) => {
            reply.view('static/index');
        }
    });

    server.route({
        method: "GET",
        path: "/index",
        handler: (request, reply) => {
            reply.view('static/index');
        }
    });

    server.route({
        method: "GET",
        path: "/about",
        handler: (request, reply) => {
            reply.view('static/about');
        }
    });

    server.route({
        method: "GET",
        path: "/login",
        handler: (request, reply) => {
            if (request.hmdbs.get("authorized")) {
                reply.redirect('/');
            } else {
                var url = [
                    config.api.authorize_url,
                    '?response_type=code',
                    '&client_id=' + config.api.client_id,
                    '&redirect_uri=' + encodeURIComponent(config.api.redirect_url),
                    '&scope=' + [
                            'user:details:self',
                            'channel:details:self',
                            'channel:update:self'
                        ].join('%20')
                ].join('');

                var data = {
                    auth_url: url
                };

                reply.view('static/login', data);
            }
        }
    });
};
