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
	} else {
		// Set Epsagon error
		if (process.env.EPSAGON_TOKEN && !process.env.DISABLE_EPSAGON) {
			try {
				if (statusCode >= 500) {
					// noinspection NpmUsedModulesInstalled, JSUnresolvedFunction
					require('epsagon').setError(error);
				} else {
					// noinspection NpmUsedModulesInstalled, JSUnresolvedFunction
					require('epsagon').setWarning(error);
				}
			} catch (e) {
				console.log(e);
			}
		}
	}

	return ({ statusCode, body: { error: output } });
};

const apigateway = createApigatewayAdapter({
	inputType: 'params',
	errorMappings: {
		'ValidationError': errors(400),
		'Invalid': errors(400),
		'Unauthorized': errors(401),
		'Forbidden': errors(403),
		'no access': errors(401),
		'No access': errors(401),
		'not found': errors(404),
		'expired': errors(404),
		'.*': errors(500)
	}
});

const middleware = (app, policies) => laconia(apigateway(app, policies));

module.exports = middleware;
module.exports.middleware = middleware;
module.exports.currentUser = currentUser;
module.exports.auth = function auth(input, ctx) {
	const user = currentUser(ctx);
	input.currentUser = user;
	ctx.currentUser = user;
};
