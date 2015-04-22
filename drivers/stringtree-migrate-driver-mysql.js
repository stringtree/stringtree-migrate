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
     * Note that the two methods 'open' and 'close' form a set:
     *  'open' will be called by the migrator before any calls to 'execute' etc.
     *  'close' will be called by the migrator after all calls to 'execute' etc.
     */
    open: function(next) {
      var self = this;
      if (!self.is_open) {
        self.is_open = true;
        self.pool = mysql.createPool(credentials);
        next(null, self.pool);
      } else {
        console.log('mysql.open: pool already created');
        next();
      }
    },
    close: function(next) {
      var self = this;
      if (self.is_open) {
        self.is_open = false;
        self.pool.end(function(err) {
          delete self.pool;
          next(err);
        });
      } else {
        console.log('mysql.close: pool already deleted');
        next();
      }
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

    _check_sql: "show tables like 'migrations'",
    check: function(next) {
      this.execute(this._check_sql, function(err, tables) {
        if (err) {
          next(err);
        } else if (!tables) {
          next(new Error('could not read table data from db'));
        } else {
          next(null, tables[0]);
        }
      });
    },

    _create_sql: "create table migrations ( level bigint )",
    create: function(next) {
      this.execute(this._create_sql, next);
    },

    _current_sql: "select level from migrations order by level desc limit 1",
    current: function(next) {
      this.execute(this._current_sql, function(err, levels) {
        var current = levels[0] || { level: 0 };
        next(null, current.level);
      });
    },

    _update_sql: "insert into migrations (level) values (?)",
    update: function(level, next) {
      this.execute(this._update_sql, [ level ], next);
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
      this.pool.getConnection(function(err, connection) {
        if ('function' == typeof(params)) {
          next = params;
          connection.query(sql, function(err, rows) {
            next(err, rows);
            connection.release();
          });
        } else {
          connection.query(sql, params, function(err, rows) {
            next(err, rows);
            connection.release();
          });
        };
      });
    }
  };
};
