# stringtree-migrate

A simple, flexible, database-independent, way to manage automated schema updates

I'm sure we've all been there. The latest version of the code needs a small change to the database schema.
The code passes all its tests on the developer machines, and maybe even on the hand-patched CI box.
But somehow that change had not yet been made on the live system by the time the code is deployed.

Result: _everyone is upset_ :(

It's a common enough problem, and there are many solutions, but most of them have serious drawbacks, such as:

* Only works with a limited set of databases
* Requires changes to the existing database schema to make it work
* Requires all database access in the code to use a particular library or framework
* Always needs network or file-system access for the list of changes
* Models changes in an abstract language, unrelated to the native language of the database
* Limited to 'generic' SQL with incomplete support for database-specific features
* Bloated code with lots of dependencies and source code to wade through

Stringtree Migrate has none of these problems.

* Database specifics are isolated in 'drivers'. Drivers are already available for several popular databases, more are being written and shared all the time, and creating a new driver is a straightforward job which any programmer can do.
* Although it's common to store the details of which migrations have been performed in a database table, this is not mandatory. All that is required is that the driver code can ask and modify this data, so feel free to fork or create a driver that stores migration status on a file system, a remote server, in a different database, or wherever you like...
* Applying migration steps is just an api call, completely independent of how your application accesses the database. It can be called from the application code, or executed as a separate process before the app is started.
* Migration steps are passed in to the migration api as an array. Where they live and how they are accessed is entirely up to you. steps can be loaded from a file system if you wish, but also stored in the source code of the application, fetched from a server, or anything else you can think of.
* Each migration step is just a value (typically some text), handed over to the driver for execution. For many databases, the natural and obvious choice is the same SQL DDL which you would type into a database command line, but it's entirely up to your driver what is required, and how it is processed.
* Stringtree Migrate is designed to be as simple as it can be. Currently just one small source file which only depends on "async".

## Installation

    $ npm install stringtree-migrate

## API

### usage example:
```js
 var mysql = require('mysql');

 var credentials = {
   host: 'localhost', port: 3306,
   database: 'test', user: 'uu', password: 'pp'
 };
 var scripts = [
   { level: 1, up: "create table ugh ( aa int )" },
   { level: 23, up: [
       "insert into ugh (aa) values (33)",
       "insert into ugh (aa) values (44)"
     ]
   }
 ];

 var driver = require('stringtree-migrate-driver-mysql')(mysql, credentials);
 var migrate = require('stringtree-migrate')(driver, scripts);
 ...
 // ensure database is at level 23 or greater
 migrate.ensure(23, function(err, level, next) { .. code that needs the db ..; next(); });
  or
 // ensure database has had all available updates applied
 migrate.ensure(function(err, level, next) { .. code that needs the db ..; next(); });
```

## What Stringtree Migrate _does not_ do

The aim of this software is to transparently and simply support the great majority of schema migration scenarios. This means that some 'features' have not been implemented, particularly if they would complicate the day-to-day business of making sure the database is up to date for the latest code.  

* No support for 'downgrading' the database. This is a tricky process, risking loss of data and very rarely required in practice. This _may_ be added in the future.
* No script processing, for example to substitute values at run-time. If you want your scripts to vary, do that in your own code _before_ passing the scripts to Stringtree Migrate.

## Drivers

A driver is a node module which implements the Stringtree Migrate driver API. This API is designed to keep the Stringtree Migrate code as simple and clean and free of database-specifics as possible. A detailed annotated example is given in _stringtree-migrate-driver-mysql_, but as an introduction, the API includes the following methods:

### Methods to manage a connection with the db
  Note that the two methods **open** and **close** form a set.
  **open** will be called by the migrator before any calls to **execute** etc.
  **close** will be called by the migrator when the 'next' callback from **ensure** is invoked
```
	open: function(next: function(err))
	close: function(next: function(err))
```

### Methods to manage the migration history
  This table is important, but only used by code in the driver. As an absolute minimum, it holds the current update level. For practical purposes it is often useful to keep a history of applied levels, possibly with timestamps, descriptions etc.. 

  The main migration code only interacts with the migration history through four methods: **check** tests if the table exists already, **create** creates a fresh table, **current** determines the current migration level, **update** sets the current migration level after a script is applied.

   This separation leaves you free to implement this how you like, as long as it obeys the semantics of the four calls. In particular:
   * feel free to use db-specific features or add extra data if you like
   * you don't even have to store it in the same database if that would be inconvenient!
   * it is _strongly_ recommended, however, that the storage of current level should have enough range for a system timestamp, as using a timestamp as a migration level is a common pattern.
```
	check: function(next: function(err, truthy/falsy value))
	create: function(next: function(err))
	current: function(next: function(err, level))
	update: function(level, next: function(err))
```

### Method to execute a migration step

  There is just a single method to execute a migration step. Stringtree Migrate does not mandate any particular format for the script, just give your chosen driver what it needs. Likewise, the response value will be whatever the driver code chooses to give back.
```
	execute: function(script, next: function(err, response))
```
### Configuration

The main Stringtree Migrate code does not need any configuration, other than setting up the correct driver and scripts to pass in to the migrator.

At the moment, the built-in unit tests require a running mysql instance and some environment variables to tell the tests how to connect to the database. It is intended that both the mysql driver and its tests will soon be separated into their own module.
