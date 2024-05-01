class Response {
  constructor(output, statusCode = 200, headers = {}) {
    const { body, isBase64Encoded, contentType } = Response.getProps(output);

    this.statusCode = statusCode;
    this.body = body;
    this.isBase64Encoded = isBase64Encoded;
    this.headers = { "Content-Type": contentType, ...headers };
  }

  static getProps(body) {
    const bodyAsObject = Object(body);
    if (bodyAsObject instanceof Buffer) {
      return {
        isBase64Encoded: true,
        contentType: "application/octet-stream",
        body: body.toString("base64"),
      };
    }
    if (bodyAsObject instanceof String) {
      return {
        isBase64Encoded: false,
        contentType: "text/plain",
        body,
      };
    }
    if (bodyAsObject instanceof Number) {
      return {
        isBase64Encoded: false,
        contentType: "text/plain",
        body: JSON.stringify(body),
      };
    }

    return {
      isBase64Encoded: false,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(body),
    };
  }
}

module.exports = Response;
