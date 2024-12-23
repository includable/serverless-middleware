const Response = require("./Response");
const Request = require("./Request");
const OpenTelemetry = require("./OpenTelemetry");

class ApiAdapter {
  constructor(app, policies, errorConverter) {
    this.app = app;
    this.policies = policies || [];
    this.errorConverter = errorConverter;
    this.statusCode = 200;
    this.additionalHeaders = {};
  }

  async handle(event, context) {
    if (event && event.source && event.source === "serverless-plugin-warmup") {
      return "Lambda is warm";
    }

    OpenTelemetry.addSpanRequestAttributes(event);

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
        await this.policies[i](input, context);
      }

      let output = await this.app(input, context);

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

      const res = new Response(output, this.statusCode, this.additionalHeaders);
      OpenTelemetry.addSpanResponseAttributes(event, res);

      return res;
    } catch (error) {
      console.error(error);
      OpenTelemetry.addSpanErrorAttributes(event, error);
      return this.errorConverter.convert(error);
    }
  }

  toFunction() {
    return this.handle.bind(this);
  }
}

module.exports = ApiAdapter;
