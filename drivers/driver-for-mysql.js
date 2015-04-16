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
 *
 * this code tested with "mysql": "2.5.4"
 */

module.exports = function(mysql, credentials) {
  return {
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
    check: function(next) {
      this.db.query("show tables like 'migrations'", function(err, tables) {
        if (!tables) return next(new Error('could not read table data from db'));
        next(null, tables[0]);
      });
    },

    /**
     * create the table for the migration log
     * it is _strongly_ recommended that this contain a column wide enough for a system timestamp
     *
     * Note that this table is only used by code in this driver,
     * so feel free to use db-specific features or add extra data if you like
     */
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
