# stringtree-migrate

A simple, flexible, database-independent, way to manage automated schema updates

I'm sure we've all been there. The latest version of the code needs a small change to the database schema.
The code passes all its tests on the developer machines, and maybe even on the hand-patched CI box.
But somehow that change had not yet been made on the live system by the time the code is deployed.

Result: everyone is upset.

It's a common enough problem, and there are many solutions, but most of them have serious constraints, such as:
* only works with a limited set of databases
* requires changes to the existing database schema to make it work
* requires all database access in the code to use a particular library or framework
* models changes in an abstract language, unrelated to the native language of the database
* requires network access or file-system reads for the list of changes

Stringtree Migrate has none of these problems.

## API

### usage example:
```js
 var mysql = require('mysql');
 var credentials = { host: 'localhost', user: 'uu', password : 'pp', database : 'test' };
 var scripts = [ { level: 1, up: "some sql..." }, { level: 23, up: [ "some sql...", "some more sql..." ] } ];

 var driver = require('driver-for-mysql')(mysql, credentials);
 var migrate = require('stringtree-migrate')(driver, scripts);
 ...
 migrate.ensure(23, function(err, level) {.. code that needs the db ..}); // ensure database is at level 23 or greater
  or
 migrate.ensure(function(err, level) {.. code that needs the db ..}); // ensure database has had all available patches applied
```

### Configuration
