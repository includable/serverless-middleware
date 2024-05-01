const RequestHeaders = require("./RequestHeaders");

class Request {
  constructor(event) {
    this.headers = new RequestHeaders(event.headers);
    this.method = event.requestContext?.http?.method?.toLowerCase() || null;
    this.params = { ...event.pathParameters, ...event.queryStringParameters };

    this.body =
      event.body === null || event.body === undefined
        ? null
        : Request.parseBody(event, this.headers);
  }

  static getBody(event) {
    return Buffer.from(
      event.body,
      event.isBase64Encoded ? "base64" : "utf8",
    ).toString();
  }

  static parseBody(event, headers) {
    const parseJsonBody = (body) => {
      try {
        return JSON.parse(body);
      } catch (e) {
        throw Error(
          "The request body is not JSON even though the Content-Type is set to application/json",
        );
      }
    };

    const contentType = headers["Content-Type"] || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return Object.fromEntries(new URLSearchParams(Request.getBody(event)));
    } else if (contentType.includes("application/json")) {
      return parseJsonBody(Request.getBody(event));
    } else {
      return event.body;
    }
  }
}

module.exports = Request;
