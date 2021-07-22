const middleware = require('../src');

it('responds correctly to serverless-plugin-warmup', async() => {
	const exampleApp = middleware(async() => {
		return 'Hello, world!';
	}).register(() => ({}));

	expect(await exampleApp({
		source: 'serverless-plugin-warmup'
	})).toEqual('Lambda is warm');
});
