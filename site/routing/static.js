module.exports = function (server) {
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
            reply.view('static/login');
        }
    });

};
