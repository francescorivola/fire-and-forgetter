# fire-and-forgetter
Simple lib to handle fire and forget operations.

[ ![Npm Version](https://badge.fury.io/js/fire-and-forgetter.svg)](https://www.npmjs.com/package/fire-and-forgetter)
[![Actions Status](https://github.com/francescorivola/fire-and-forgetter/workflows/Node%20CI/badge.svg)](https://github.com/francescorivola/fire-and-forgetter/actions)
[![CodeFactor](https://www.codefactor.io/repository/github/francescorivola/fire-and-forgetter/badge)](https://www.codefactor.io/repository/github/francescorivola/fire-and-forgetter)
[![codecov](https://codecov.io/gh/francescorivola/fire-and-forgetter/branch/master/graph/badge.svg)](https://codecov.io/gh/francescorivola/fire-and-forgetter) 
[![Dependabot](https://badgen.net/badge/Dependabot/enabled/green?icon=dependabot)](https://dependabot.com/)


## Installation

```
$ npm install fire-and-forgetter --save
```

## The Problem

In NodeJs applications performing fire and forget operations we need a way to wait until all those operations complete in order to perform a graceful application shutdown.

Also, fire and forget operations must have proper error handling in order to avoid `'unhandledRejection'`.

### Example with Express
```js
const express = require('express')
const someDb = require('some-db');
const app = express();

(async function main() {

    const db = await someDb.connect();
    
    app.post('/', (req, res) => {
        res.send('Got request, now I am processing it in fire and forget mode');
        process(req.body);
    })

    async function process(payload) {
        
        // do some stuff that could take several milliseconds
        // i.e interact with another service, I/O operations, etc..
        // then finally we persist the payload.

        await db.insert(payload);
    }

    const server = app.listen(3000);

    process.on('SIGTERM', async () => {
        try {
            await new Promise(resolve => server.close(resolve));
            // above we have closed the web server, now we are closing db connection
            // however we have may some fire and forget operation still in progress
            // so close the db now won't result in a clear application shutdown
            await db.close();
            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    });
})().catch(() => {
    process.exit(1);
});
```
Note: this example is a simplified version of real code, the someDb is a fake package and I haven't execute this code.

## The Solution

Fire and forgetter is a tiny library to keep the state of fire and forget operations. 

It ensures that a catch is always added to these operations (to avoid any Unhandled Promise Rejections that could lead in memory leaks). 

Finally it provides a close method that:
1) resolves when all pending fire and forget operations have been fulfilled or rejected
2) mark the instance as closed so no new fire an forget operations can be executed. 

### Example with Express
```js
const express = require('express')
const someDb = require('some-db');
const fireAndForgetter = require('fire-and-forgetter').default;
const app = express();

(async function main() {

    const fireAndForget = fireAndForgetter();
    const db = await someDb.connect();
    
    app.post('/', (req, res) => {
        res.send('Got request, now I am processing it in fire and forget mode');
        fireAndForget(() => process(req.body));
    })

    async function process(payload) {
        
        // do some stuff that could take several milliseconds
        // i.e interact with another service, I/O operations, etc..
        // then finally we persist the payload.

        await db.insert(payload);
    }

    const server = app.listen(3000);

    process.on('SIGTERM', async () => {
        try {
            await new Promise(resolve => server.close(resolve));
            // above we have closed the web server, now before closing db connection
            // we are going to close fireAndForget so we wait until all fire and forget
            // operations have been complete and we can safetly close the database connection
            // in order to ensure a good application shutdown
            await fireAndForget.close();
            await db.close();
            process.exit(0);
        } catch (error) {
            process.exit(1);
        }
    });
})().catch(() => {
    process.exit(1);
});
```

## API

Please check tests in order to get more information about the fire and forgetter API.

## License

MIT