var util = require('util');

/**
 * mysql driver for stringtree-migrate
 * (feel free to use this as an example template if you want to write your own drivers)
 *
 * usage example:
 *   var mysql = require('mysql');
 *   var credentials = { host: 'localhost', user: 'uu', password : 'pp', database : 'test' };
 *   var driver = require('driver-for-mysql')(mysql, credentials);
 *   var scripts = [ { level: 1, up: "some sql..." }, { level: 23, up: [ "some sql...", "some more sql..." ] } ];
 *   var migrate = require('stringtree-migrate')(driver, scripts);
 *   ...
 *   migrate.ensure(23, function(err, level) {.. code that needs the db ..}); // ensure database is at level 23 or greater
 *     or
 *   migrate.ensure(function(err, level) {.. code that needs the db ..}); // ensure database has had all available patches applied
 *
 * this code tested with { "mysql": "2.5.4" }
 */

module.exports = function(mysql, credentials) {
  return {

    /**
     * manage a connection with the db
     *
     * Note that the three methods 'open', 'close' and 'is_open' form a set:
     *  'open' will be called by the migrator (if 'is_open' returns untrue) before any calls to 'execute' etc.
     *  'close' is left for the client code to call at the end of the application, if required by the db
     * If you implement your own, make sure that open and close always set whatever is used by 'is_open'
     */
    open: function(next) {
      if (this.is_open()) return next();
      this.db = mysql.createConnection(credentials); next();
    },
    close: function(next) {
      if (!this.is_open()) return next();
      this.db.end(function(err) { this.db = null; next(err); });
    },
    is_open: function() {
      return this.db ? true : false;
    },

    /**
     * manage the migrations table:
     *
     * This table is important, but only used by code in this driver. The main migration code only
     * interacts with this table through the following four methods:
     *  'check' tests if the table exists already
     *  'create' creates a fresh table
     *  'current' determines the current migration level
     *  'update' sets the current migration level after a script is applied
     *
     * This separation leaves you free to implement this how you like, as long as it obeys the
     * semantics of the four calls. In particular:
     *  + feel free to use db-specific features or add extra data if you like
     *  + you don't even have to store it in the same database if that would be inconvenient!
     *  + it is _strongly_ recommended, however, that this should contain a column wide enough for
     *    a system timestamp, as using a timestamp as a migration 'level' is a common pattern
     */

    check: function(next) {
      this.db.query("show tables like 'migrations'", function(err, tables) {
        if (!tables) return next(new Error('could not read table data from db'));
        next(null, tables[0]);
      });
    },
    create: function(next) {
      this.execute("create table migrations ( level bigint )", next);
    },
    current: function(next) {
      this.execute("select level from migrations order by level desc limit 1", function(err, levels) {
        next(null, levels[0]);
      });
    },
    update: function(level, next) {
      this.execute("insert into migrations (level) values (?)", [ level ], next);
    },

    /**
     * execute a script to adjust the database
     *
     * This can be called in two ways:
     *  + execute(sql, params, next)
     *  + execute(sql, next)
     *
     * Typically the first form is used within this driver for table management etc., while the second
     * form is used when the main migration code applies migration scripts
     */
    execute: function(sql, params, next) {
      var ret;
      if ('function' == typeof(params)) {
        next = params;
        this.db.query(sql, function(err, rows) {
          return next(err, rows)
        });
      } else {
        this.db.query(sql, params, function(err, rows) {
          return next(err, rows)
        });
      }
    }
  };
};
