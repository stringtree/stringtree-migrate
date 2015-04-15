var util = require('util');

module.exports = function(db) {
  return {
    open: function(next) { next(null); },
    close: function(next) { next(null); },
    check: function(next) {
      var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations';");
      if (!tables) return next(new Error('could not read table data from db'));
      next(null, tables[0]);
    },
    create: function(next) { this.execute("create table migrations ( level int );", next)},
    current: function(next) {
      var levels = db.exec("select level from migrations order by level desc;");
      next(null, levels[0]);
    },
    update: function(level, next) { this.execute("insert into migrations (level) values ($level);", { $level: level }, next)},
    execute: function(sql, params, next) {
      var ret;
      if ('function' == typeof(params)) {
        ret = db.exec(sql);
        next = params;
      } else {
        var stmt = db.prepare(sql, params);
        if (stmt.step()) {
          ret = stmt.getAsObject();
        }
      }
      next(null, ret)
    }
  };
};