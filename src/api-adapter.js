// This is a slightly modified version of Laconia's API adapter to work around some peculiar issues

const { req, res } = require('@laconia/event').apigateway;
const ApiGatewayResponse = require('@laconia/event/src/apigateway/ApiGatewayResponse');

const createApigatewayAdapter = ({
	functional = true,
	responseStatusCode,
	responseAdditionalHeaders,
	errorMappings
} = {}) => (app, policies = []) => {
	const adapter = new ApiGatewayEventAdapter(
		app,
		new ApiGatewayParamsInputConverter(),
		new ApiGatewayOutputConverter({
			statusCode: responseStatusCode,
			additionalHeaders: responseAdditionalHeaders
		}),
		new ApiGatewayNameMappingErrorConverter({
			additionalHeaders: responseAdditionalHeaders,
			mappings: errorMappings
		}),
		policies
	);

	return functional ? adapter.toFunction() : adapter;
};

module.exports = createApigatewayAdapter;

//////// ===================

const getMappingEntries = mappings =>
	mappings instanceof Map ? mappings.entries() : Object.entries(mappings);

const getMappingResponse = (mappings, error) => {
	let mappingResponse = {};
	for (const [errorRegex, mapping] of getMappingEntries(mappings)) {
		if (error.name.match(errorRegex) || error.message.match(errorRegex)) {
			mappingResponse = mapping(error);
			break;
		}
	}

	return mappingResponse;
};

class ApiGatewayNameMappingErrorConverter {
	constructor({ additionalHeaders = {}, mappings = {} } = {}) {
		this.additionalHeaders = additionalHeaders;
		this.mappings = mappings;
	}

	convert(error) {
		const mappingResponse = getMappingResponse(this.mappings, error);
		const body = mappingResponse.body || error.message;
		const statusCode = mappingResponse.statusCode || error.statusCode || 500;
		const headers = Object.assign(
			this.additionalHeaders,
			mappingResponse.headers
		);

		return res(body, statusCode, headers);
	}
}

//////// ===================

class ApiGatewayOutputConverter {
	constructor({ statusCode = 200, additionalHeaders = {} } = {}) {
		this.statusCode = statusCode;
		this.additionalHeaders = additionalHeaders;
	}

	convert(output) {
		if (output instanceof ApiGatewayResponse || (typeof output === 'object' && output.statusCode)) {
			return {
				...output,
				headers: Object.assign(this.additionalHeaders, output.headers)
			};
		}

		return res(output, this.statusCode, this.additionalHeaders);
	}
}

//////// ===================

class ApiGatewayEventAdapter {
	constructor(
		app,
		inputConverter,
		outputConverter,
		errorConverter,
		policies,
	) {
		this.app = app;
		this.policies = policies || [];
		this.inputConverter = inputConverter;
		this.outputConverter = outputConverter;
		this.errorConverter = errorConverter;
	}

	async handle(event, laconiaContext) {
		if (event && event.source && event.source === 'serverless-plugin-warmup') {
			return 'Lambda is warm';
		}

		try {
			const input = await this.inputConverter.convert(event);

			for (let i = 0; i < this.policies.length; i++) {
				await this.policies[i](input, laconiaContext);
			}

			return this.outputConverter.convert(await this.app(input, laconiaContext));
		} catch (error) {
			console.error(error);
			return this.errorConverter.convert(error);
		}
	}

	toFunction() {
		return this.handle.bind(this);
	}
}

//////// ===================

class ApiGatewayParamsInputConverter {
	async convert(event) {
		// EventBridge events shouldn't be parsed
		if(!event.headers && event['detail-type'] && event.source){
			return event
		}

		// Process events from API Gateway
		const { body, headers, params } = req(event);
		const { pathParameters, queryStringParameters } = event;
		return {
			...event,
			...params || {},
			headers,
			params,
			query: queryStringParameters || {},
			body: body || {},
			path: pathParameters || {}
		};
	}
}
