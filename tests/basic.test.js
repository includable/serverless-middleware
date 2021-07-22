const middleware = require('../src');
const event = require('lambda-sample-events/events/aws/apigateway-aws-proxy.json');

it('responds with plain text string', async() => {
	const exampleApp = middleware(async() => {
		return 'Hello, world!';
	}).register(() => ({}));

	expect(await exampleApp(event)).toEqual({
		'body': 'Hello, world!',
		'headers': { 'Content-Type': 'text/plain' },
		'isBase64Encoded': false,
		'statusCode': 200
	});
});

it('responds with JSON body', async() => {
	const exampleApp = middleware(async() => {
		return { result: 'Hello, world!' };
	}).register(() => ({}));

	expect(await exampleApp(event)).toEqual({
		'body': '{"result":"Hello, world!"}',
		'headers': { 'Content-Type': 'application/json; charset=utf-8' },
		'isBase64Encoded': false,
		'statusCode': 200
	});
});
