/*jslint node: true */
"use strict";

var util = require('util');

var sqljs = require('sql.js');

module.exports = function(config) {
  if (!config) config = {};
  var db = config.database || new sqljs.Database();

  function q(sql, params, next) {
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

    _check_sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='st_migrate'",
    check: function(next) {
      var tables = db.exec(this._check_sql);
      next(null, tables && tables.length > 0);
    },
    _create_sql: "create table st_migrate ( level int )",
    create: function(next) {
      next(null, db.exec(this._create_sql));
    },
    _current_sql: "select level from st_migrate order by level desc",
    current: function(next) {
      var value = db.exec(this._current_sql);
      next(null, value && value[0] && value[0].values[0][0]);
    },
    _update_sql: "insert into st_migrate (level) values ($level)",
    update: function(level, next) {
      q(this._update_sql, { $level: level }, next);
    },

    execute: function(sql, next) {
      var value = db.exec(sql);
      next(null, value);
    }
  };
};
