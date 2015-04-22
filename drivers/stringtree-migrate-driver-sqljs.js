/*jslint node: true */
"use strict";

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
    _check_sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'",
    check: function(next) {
      var tables = db.exec(this._check_sql);
      next(null, tables && tables.length > 0);
    },
    _create_sql: "create table migrations ( level int )",
    create: function(next) { next(null, db.exec(this._create_sql)); },
    _current_sql: "select level from migrations order by level desc",
    current: function(next) { next(null, db.exec(this._current_sql)[0]); },
    _update_sql: "insert into migrations (level) values ($level)",
    update: function(level, next) { execute(this._update_sql, { $level: level }, next)},
    execute: function(sql, next) { next(null,  db.exec(sql)); }
  };
};
