# stringtree-migrate

A simple, flexible, database-independent, way to manage automated schema updates

I'm sure we've all been there. The latest version of the code needs a small change to the database schema.
The code passes all its tests on the developer machines, and maybe even on the hand-patched CI box.
But somehow that change had not yet been made on the live system by the time the code is deployed.

Result: everyone is upset.

It's a common enough problem, and there are many solutions, but most of them have serious drawbacks, such as:

* Only works with a limited set of databases
* Requires changes to the existing database schema to make it work
* Requires all database access in the code to use a particular library or framework
* Always needs network or file-system access for the list of changes
* Models changes in an abstract language, unrelated to the native language of the database
* Limited to 'generic' sql with incomplete support for database-specific features

Stringtree Migrate has none of these problems.

* Drivers are already available for several popular databases, more are being written and shared all the time, and creating a new driver is a straightforward job which any programmer can do.
* Although it's common to store the details of which migrations have been performed in a database table, there is no hard requirement. All that is required is that the driver code can ask and modify this data, so feel free to fork or create a driver that stores migration status on a file system, or a remote server, or in a separate database...
* Applying migration steps is just an api call, completely independent of how the main application accesses the database. It can be called from the application code, or executed as a separate process before the app is started.
* Migration steps are passed in to the migration api as an array. Where they live and how they are accessed is entirely up to you. steps can be loaded from a file system if you wish, but also stored in the source code of the application, fetched from a server, or anything else you can think of.
* Each migration step is just some text, handed over to the driver for execution. For many databases, the natural and obvious choice is the same SQL DDL which you would type into a database command line, but it's entirely up to the driver how this is processed.

## Installation

    $ npm install stringtree-migrate

## API

### usage example:
```js
 var mysql = require('mysql');
 var credentials = { host: 'localhost', user: 'uu', password : 'pp', database : 'test' };
 var scripts = [ { level: 1, up: "some sql..." }, { level: 23, up: [ "some sql...", "some more sql..." ] } ];

 var driver = require('stringtree-migrate-driver-mysql')(mysql, credentials);
 var migrate = require('stringtree-migrate')(driver, scripts);
 ...
 migrate.ensure(23, function(err, level) {.. code that needs the db ..}); // ensure database is at level 23 or greater
  or
 migrate.ensure(function(err, level) {.. code that needs the db ..}); // ensure database has had all available updates applied
```

## Drivers

A driver is a node module which implements the Stringtree Migrate driver API. This API is designed to keep the Stringtree Migrate code as simple and clean as possible, and to keep out of the way of any and all database-specific features. An detailed annotated example is given in stringtree-migrate-driver-mysql.js, but as an introduction, the API includes the following methods:

* methods to manage a connection with the db
  Note that the three methods 'open', 'close' and 'is_open' form a set:
  'open' will be called by the migrator (if 'is_open' returns untrue) before any calls to 'execute' etc.
  'close' is left for the client code to call at the end of the application, if required by the db
  If you implement your own, make sure that open and close always set whatever is used by 'is_open'

  open: function(next function(err))
  close: function(next function(err))
  is_open: function() returns true or false

* methods to manage the migrations table:
  This table is important, but only used by code in this driver. The main migration code only interacts with this table through the following four methods:
  'check' tests if the table exists already
  'create' creates a fresh table
  'current' determines the current migration level
  'update' sets the current migration level after a script is applied

   This separation leaves you free to implement this how you like, as long as it obeys the
   semantics of the four calls. In particular:
   * feel free to use db-specific features or add extra data if you like
   * you don't even have to store it in the same database if that would be inconvenient!
   * it is _strongly_ recommended, however, that this should contain a column wide enough for a system timestamp, as using a timestamp as a migration 'level' is a common pattern

  check: function(next: function(err, truthy value))
  create: function(next: function(err))
  current: function(next: function(err, level))
  update: function(level, next: function(err))

* method to execute a migration step to adjust the database
  This can be called in two ways:
  * execute(sql, params, next)
  * execute(sql, next)

  Typically the first form is used within this driver for table management etc., while the second form is used when the main migration code applies migration scripts. Stringtree Migrate does not mandate any particular format for the script or the parameters, that is up to the driver code to help make driver coding simpler by avoiding tedious format conversion. Likewise, any response value can be whatever the driver code chooses to give back.

  execute: function(script, params, next: function(err, response))

### Configuration

The main Stringtree Migrate code does not need any configuration, other than setting up the correct driver and migration scripts to pass in to the migrator.

At the moment, the built-in unit tests require a running mysql instance and some environment variables to tell the tests how to connect to the database. It is intended that both the mysql driver and the tests will soon be separated into their own module.
