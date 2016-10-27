module.exports = (request, reply) => {
    reply(JSON.stringify({"error": "not in production"}));
};
