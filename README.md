# Serverless Middleware

Some helpers for writing API endpoints using AWS Lambda.

---

## Installation

```shell
yarn add @includable/serverless-middleware
```

## Example usage

```js
import { middleware, auth } from '@includable/serverless-middleware';

const dependencies = {
	// dependencies for the dependency injector
};

export const app = async ({ query, path, body }, { currentUser, /* dependences */ }) => {
	// if `auth` is included in the second param of `middleware`, currentUser
	// will be an object in the form of `{ id, groups, email, ... }`

	// your business logic goes here

	return {
		success: true,
		text: 'Hello, world!'
	};
}

export const handler = middleware(app, [auth]).register(dependencies);
```

## Options

### Warmup support

Out of the box this middleware setup supports the [serverless-plugin-warmup](https://github.com/FidelLimited/serverless-plugin-warmup) 
serverless plugin. 

Simply install the serverless plugin, no other changes to your code necessary. 
The middleware will automatically prevent code execution on warmup requests.



<br /><br />

---

<div align="center">
	<b>
		<a href="https://includable.com/consultancy/?utm_source=serverless-middleware">Get professional support for this package →</a>
	</b>
	<br>
	<sub>
		Custom consulting sessions availabe for implementation support and feature development.
	</sub>
</div>
