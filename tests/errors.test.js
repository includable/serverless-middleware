const middleware = require("../src");
const event = require("lambda-sample-events/events/aws/apigateway-aws-proxy.json");

it("responds with correct error message and status", async () => {
  const exampleApp = middleware(async () => {
    throw new Error("page not found");
  });

  const response = await exampleApp(event);
  expect(response.statusCode).toEqual(404);
  expect(JSON.parse(response.body).error).toEqual(
    expect.objectContaining({
      message: "page not found",
    }),
  );
});
