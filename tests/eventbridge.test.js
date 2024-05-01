const middleware = require("../src");

it("eventbridge events are passed through", async () => {
  const payload = {
    version: "0",
    id: "03f6b260-9ee8-af5f-4a02-95ebf5fc0925",
    "detail-type": "ArtworkUpdate",
    source: "some-other-system",
    account: "493638157050",
    time: "2020-11-10T10:36:28Z",
    region: "eu-west-1",
    resources: [],
    detail: {
      id: 31329,
      action: "create",
    },
  };

  const exampleApp = middleware(async (event) => {
    return event;
  }).register(() => ({}));

  expect(JSON.parse(JSON.stringify(await exampleApp(payload)))).toEqual({
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    isBase64Encoded: false,
    statusCode: 200,
  });
});
