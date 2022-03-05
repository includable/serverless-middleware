const laconia = require('@laconia/core');
const currentUser = require('./currentUser');
const createApigatewayAdapter = require('./api-adapter');

const errors = (statusCode) => (error) => {
	const output = {
		message: error.message
	};

	if (error.isJoi && error.details) {
		output.details = error.details;
	}

	if (process.env.STAGE !== 'production') {
		output.debugContext = error;
	} else if (statusCode >= 500) {
		// TODO
	}

	return ({ statusCode, body: { error: output } });
};

const apigateway = createApigatewayAdapter({
	inputType: 'params',
	errorMappings: {
		'ValidationError': errors(400),
		'Invalid': errors(400),
		'not found': errors(404),
		'Unauthorized': errors(401),
		'Forbidden': errors(403),
		'.*': errors(500)
	}
});

const middleware = (app, policies) => laconia(apigateway(app, policies));

module.exports = middleware;
module.exports.middleware = middleware;
module.exports.currentUser = currentUser;
module.exports.auth = function auth(_, ctx) {
	ctx.currentUser = currentUser(ctx);
};
