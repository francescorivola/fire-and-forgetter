# fire-and-forgetter
Simple lib to handle fire and forget operations.

[ ![Npm Version](https://badge.fury.io/js/fire-and-forgetter.svg)](https://www.npmjs.com/package/fire-and-forgetter)
[![Codeship Status for francescorivola/fire-and-forgetter](https://app.codeship.com/projects/99cf32b0-def4-0137-e6fc-2ab416e579f2/status?branch=master)](https://app.codeship.com/projects/372209)
[![CodeFactor](https://www.codefactor.io/repository/github/francescorivola/fire-and-forgetter/badge)](https://www.codefactor.io/repository/github/francescorivola/fire-and-forgetter)
[![codecov](https://codecov.io/gh/francescorivola/fire-and-forgetter/branch/master/graph/badge.svg)](https://codecov.io/gh/francescorivola/fire-and-forgetter) 
[![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=francescorivola/fire-and-forgetter)](https://dependabot.com)


## Installation

```
$ npm install fire-and-forgetter --save
```

## The Problem

In NodeJs application that perform fire and forget operations it comes up the need a way to know and wait until all those fire and forget operations completes in order to perform a graceful shutdown.

Also, fire and forget operations must be always followed by a catch in order to avoid `'unhandledRejection'`.

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

## The Solution

Fire and forgetter provides a tiny library to keep the state of fire and forget operations. 

It ensures that a catch is always added to these operations. 

Finally it provides a close method that:
1) throws a ClosingError if new fire and forget are requested
2) resolves when all pending fire and forget operations have been fullfilled or rejected

### Example with Express
```js
const express = require('express')
const someDb = require('some-db');
const fireAndForgetter = require('fire-and-forgetter');
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