var util = require('util');

module.exports = function(mysql, credentials) {
  return {
    open: function(next) { this.db = mysql.createConnection(credentials); next(null); },
    close: function(next) { this.db.end(function(err) { next(err); }); },
    check: function(next) {
      this.db.query("show tables like 'migrations'", function(err, tables) {
        if (!tables) return next(new Error('could not read table data from db'));
        next(null, tables[0]);
      });
    },
    create: function(next) { this.execute("create table migrations ( level int );", next)},
    current: function(next) {
      var levels = this.db.exec("select level from migrations order by level desc limit 1;");
      next(null, levels[0]);
    },
    update: function(level, next) { this.execute("insert into migrations (level) values (?);", [ level ], next)},
    execute: function(sql, params, next) {
      var ret;
      if ('function' == typeof(params)) {
        next = params;
        this.db.query(sql, function(err, rows) {
          return next(null, rows)
        });
      } else {
        this.db.query(sql, params, function(err, rows) {
          return next(null, rows)
        });
      }
    }
  };
};