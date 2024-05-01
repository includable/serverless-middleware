const Response = require("./lib/Response");
const Request = require("./lib/Request");

const createApigatewayAdapter =
  ({
    responseStatusCode = 200,
    responseAdditionalHeaders = {},
    errorMappings = {},
  } = {}) =>
  (app, policies = []) => {
    const adapter = new ApiGatewayEventAdapter(
      app,
      responseStatusCode,
      responseAdditionalHeaders,
      new ApiGatewayNameMappingErrorConverter({
        additionalHeaders: responseAdditionalHeaders,
        mappings: errorMappings,
      }),
      policies,
    );

    return adapter.toFunction();
  };

module.exports = createApigatewayAdapter;

const getMappingEntries = (mappings) =>
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
      mappingResponse.headers,
    );

    return new Response(body, statusCode, headers);
  }
}

class ApiGatewayEventAdapter {
  constructor(app, statusCode, additionalHeaders, errorConverter, policies) {
    this.app = app;
    this.policies = policies || [];
    this.errorConverter = errorConverter;
    this.statusCode = statusCode;
    this.additionalHeaders = additionalHeaders;
  }

  async handle(event, laconiaContext) {
    if (event && event.source && event.source === "serverless-plugin-warmup") {
      return "Lambda is warm";
    }

    try {
      let input = event;

      // EventBridge events shouldn't be parsed
      if (event.headers || !event["detail-type"] || !event.source) {
        // Process events from API Gateway
        const { body, headers, params, method } = new Request(event);
        const { pathParameters, queryStringParameters } = event;

        input = {
          method,
          ...event,
          ...(params || {}),
          headers,
          params,
          query: queryStringParameters || {},
          body: body || {},
          path: pathParameters || {},
        };
      }

      for (let i = 0; i < this.policies.length; i++) {
        await this.policies[i](input, laconiaContext);
      }

      let output = await this.app(input, laconiaContext);

      if (output instanceof Response) {
        return {
          ...output,
          headers: Object.assign(this.additionalHeaders, output.headers),
        };
      }

      if (typeof output === "object" && output.statusCode && output.body) {
        this.statusCode = output.statusCode;
        if (output.headers && typeof output.headers === "object") {
          this.additionalHeaders = {
            ...this.additionalHeaders,
            ...output.headers,
          };
        }
        output = output.body;
      }

      return new Response(output, this.statusCode, this.additionalHeaders);
    } catch (error) {
      console.error(error);
      return this.errorConverter.convert(error);
    }
  }

  toFunction() {
    return this.handle.bind(this);
  }
}
