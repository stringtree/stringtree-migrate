var util = require('util');

module.exports = function(db) {
  function execute(sql, params, next) {
    var ret;
    var stmt = db.prepare(sql, params);
    if (stmt.step()) {
      ret = stmt.getAsObject();
    }
    next(null, ret);
  }

  return {
    open: function(next) { next(null); },
    close: function(next) { next(null); },
    check: function(next) {
      var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'");
      next(null, tables && tables.length > 0);
    },
    create: function(next) { next(null, db.exec("create table migrations ( level int )")); },
    current: function(next) { next(null, db.exec("select level from migrations order by level desc")[0]); },
    update: function(level, next) { execute("insert into migrations (level) values ($level)", { $level: level }, next)},
    execute: function(sql, next) { next(null,  db.exec(sql)); }
  };
};
