const currentUser = require("./policies/currentUser");
const ApiAdapter = require("./lib/ApiAdapter");
const ErrorConverter = require("./lib/ErrorConverter");
const Response = require("./lib/Response");

const errors = (statusCode) => (error) => {
  const output = {
    message: error.message,
  };

  if (error.isJoi && error.details) {
    output.details = error.details;
  }

  if (process.env.STAGE !== "production") {
    output.debugContext = error;
  }

  return new Response({ error: output }, statusCode);
};

const adapter = (app, policies) => {
  const adapter = new ApiAdapter(
    app,
    policies,
    new ErrorConverter({
      ValidationError: errors(400),
      Invalid: errors(400),
      Unauthorized: errors(401),
      Forbidden: errors(403),
      "no access": errors(401),
      "No access": errors(401),
      "not found": errors(404),
      expired: errors(404),
      ".*": errors(500),
    }),
  );

  return adapter.toFunction();
};

const middleware = (app, policies = []) => {
  if (typeof app !== "function")
    throw new TypeError(
      `middleware() expects to be passed a function, you passed: ${JSON.stringify(
        app,
      )}`,
    );

  const context = {};
  const core = async (event, eventContext) => {
    context.event = event;
    context.context = eventContext;

    return adapter(app, policies)(event, context);
  };

  return Object.assign(core, {
    /**
     * Register dependencies for our handler.
     *
     * @param {()=>Object|Object} dependencies
     */
    register(dependencies) {
      if (typeof dependencies === "function") {
        dependencies = dependencies();
      }
      Object.assign(context, dependencies);
      return this;
    },
  });
};

module.exports = middleware;
module.exports.middleware = middleware;
module.exports.currentUser = currentUser;
module.exports.auth = function auth(input, ctx) {
  const user = currentUser(ctx);
  input.currentUser = user;
  ctx.currentUser = user;
};
