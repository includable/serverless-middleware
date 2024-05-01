const middleware = require("../src");
const event = require("lambda-sample-events/events/aws/apigateway-aws-proxy.json");

it("responds with plain text string", async () => {
  const exampleApp = middleware(async () => {
    return "Hello, world!";
  }).register(() => ({}));

  expect(await exampleApp(event)).toEqual({
    body: "Hello, world!",
    headers: { "Content-Type": "text/plain" },
    isBase64Encoded: false,
    statusCode: 200,
  });
});

it("responds with JSON body", async () => {
  const exampleApp = middleware(async () => {
    return { result: "Hello, world!" };
  }).register(() => ({}));

  expect(await exampleApp(event)).toEqual({
    body: '{"result":"Hello, world!"}',
    headers: { "Content-Type": "application/json; charset=utf-8" },
    isBase64Encoded: false,
    statusCode: 200,
  });
});

it("responds with a Number as plain text", async () => {
  const exampleApp = middleware(async () => {
    return 123456;
  }).register(() => ({}));

  expect(await exampleApp(event)).toEqual({
    body: "123456",
    headers: { "Content-Type": "text/plain" },
    isBase64Encoded: false,
    statusCode: 200,
  });
});

it("can register dependencies", async () => {
  const helper = jest.fn();
  const exampleApp = (event, { helper }) => helper("hello");

  const wrappedApp = middleware(exampleApp).register(() => ({ helper }));
  await wrappedApp({}, {}, null);

  expect(helper).toHaveBeenCalledWith("hello");
});

it("can register dependencies as function", async () => {
  const helper = jest.fn();
  const exampleApp = (event, { helper }) => helper("hello");

  const wrappedApp = middleware(exampleApp).register({ helper });
  await wrappedApp({}, {}, null);

  expect(helper).toHaveBeenCalledWith("hello");
});

it("parses JSON body", async () => {
  const helper = jest.fn();
  const exampleApp = (event, {}) => helper(event);
  const event = {
    body: JSON.stringify({ name: "Alice" }),
    headers: {
      "content-type": "application/json",
    },
  };

  const wrappedApp = middleware(exampleApp);
  await wrappedApp(event, {});

  expect(helper).toHaveBeenCalledWith(
    expect.objectContaining({
      headers: {
        "content-type": "application/json",
      },
      body: {
        name: "Alice",
      },
    }),
  );
});

it("parses JSON body", async () => {
  const helper = jest.fn();
  const exampleApp = (event, {}) => helper(event);
  const event = {
    body: "name=Alice&age=30",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
  };

  const wrappedApp = middleware(exampleApp);
  await wrappedApp(event, {});

  expect(helper).toHaveBeenCalledWith(
    expect.objectContaining({
      body: { name: "Alice", age: "30" },
    }),
  );
});
