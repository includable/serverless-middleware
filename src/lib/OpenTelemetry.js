const { trace } = require("@opentelemetry/api");

const isApiGwEvent = (event) => {
  return (
    event?.requestContext?.domainName != null &&
    event?.requestContext?.requestId != null
  );
};

const isSnsEvent = (event) => {
  return event?.Records?.[0]?.EventSource === "aws:sns";
};

const isSqsEvent = (event) => {
  return event?.Records?.[0]?.eventSource === "aws:sqs";
};

const isS3Event = (event) => {
  return event?.Records?.[0]?.eventSource === "aws:s3";
};

const isDDBEvent = (event) => {
  return event?.Records?.[0]?.eventSource === "aws:dynamodb";
};

const isCloudfrontEvent = (event) => {
  return event?.Records?.[0]?.cf?.config?.distributionId != null;
};

const getFullUrl = (event) => {
  if (!event.headers) return undefined;
  function findAny(event, key1, key2) {
    return event.headers[key1] ?? event.headers[key2];
  }
  const host = findAny(event, "host", "Host");
  const proto = findAny(event, "x-forwarded-proto", "X-Forwarded-Proto");
  const port = findAny(event, "x-forwarded-port", "X-Forwarded-Port");
  if (!(proto && host && (event.path || event.rawPath))) {
    return undefined;
  }
  let answer = proto + "://" + host;
  if (port) {
    answer += ":" + port;
  }
  answer += event.path ?? event.rawPath;
  if (event.queryStringParameters) {
    let first = true;
    for (const key in event.queryStringParameters) {
      answer += first ? "?" : "&";
      answer += encodeURIComponent(key);
      answer += "=";
      answer += encodeURIComponent(event.queryStringParameters[key]);
      first = false;
    }
  }
  return answer;
};

class OpenTelemetry {
  static _getSpan() {
    return trace.getActiveSpan();
  }

  static setSpanAttribute(key, value) {
    const span = this._getSpan();
    if (span) span.setAttribute(key, value);
  }

  static addSpanRequestAttributes(event) {
    try {
      const span = this._getSpan();
      if (!span) return;

      if (isApiGwEvent(event)) {
        const fullUrl = getFullUrl(event);
        span.setAttribute("faas.trigger", "http");
        span.setAttribute("http.route", event.routeKey?.split(" ")[1]);
        fullUrl && span.setAttribute("url.full", fullUrl);
        span.setAttribute(
          "http.request.method",
          event.requestContext?.http?.method,
        );
        span.setAttribute(
          "http.user_agent.original",
          event.requestContext?.http?.userAgent,
        );
        span.setAttribute("network.protocol.name", "http");
        span.setAttribute(
          "network.protocol.version",
          event.requestContext?.http?.protocol?.split("/")?.[1],
        );
        span.setAttribute("http.request.id", event.requestContext?.requestId);
        span.setAttribute(
          "http.request.header.content-type",
          event.headers?.["content-type"],
        );
        span.setAttribute("http.request.body_size", event.body?.length || 0);
        span.setAttribute("url.path", event.rawPath);
        span.setAttribute("url.query", event.rawQueryString);
        if (event.requestContext?.authorizer?.jwt?.claims) {
          const { claims } = event.requestContext.authorizer.jwt;
          span.setAttribute("user.id", claims.sub || claims.id);
          span.setAttribute("user.auth_method", "jwt");
          span.setAttribute(
            "user.role",
            claims.role || claims["cognito:groups"],
          );
          if (claims.event_id?.includes("Parent=")) {
            const parentTraceId = claims.event_id
              .split("Parent=")?.[1]
              ?.split(";")?.[0];
            span.setAttribute("user.auth_parent_trace_id", parentTraceId);
          }
        }
      }

      // TODO: deal with other event types (S3, SQS, SNS, etc.)
    } catch (e) {
      console.debug("Error in addSpanRequestAttributes", e);
    }
  }

  static addSpanResponseAttributes(event, response) {
    try {
      const span = this._getSpan();
      if (!span) return;

      if (isApiGwEvent(event)) {
        span.setAttribute("http.response.status_code", response.statusCode);
        span.setAttribute(
          "http.response.header.content-type",
          response.headers?.["content-type"] ||
            response.headers?.["Content-Type"],
        );
        span.setAttribute(
          "http.response.body_size",
          response.body?.length || 0,
        );
      }
    } catch (e) {
      console.debug("Error in addSpanResponseAttributes", e);
    }
  }

  static addSpanErrorAttributes(event, error) {
    try {
      const span = this._getSpan();
      if (!span) return;

      span.setAttribute("error", true);
      span.setAttribute("exception.message", error.message);
      span.setAttribute("exception.type", error.name);
      span.setAttribute("exception.stacktrace", error.stack);
    } catch (e) {
      console.debug("Error in addSpanErrorAttributes", e);
    }
  }
}

module.exports = OpenTelemetry;
