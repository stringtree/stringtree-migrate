/*jslint node: true */
"use strict";

var test = require('tape');
var util = require('util');

var sqljs = require('sql.js');
var db = new sqljs.Database();
var driver = require('../drivers/stringtree-migrate-driver-sqljs')({ database: db });

var dfl_scripts = [
  { level: 1, up: 'create table st_ugh ( aa int )' },
  { level: 2, up: 'insert into st_ugh (aa) values (2)' },
  { level: 3, up: [ 'update st_ugh set aa=3 where aa=2', 'insert into st_ugh (aa) values (99)' ] }
];

var dname = "sql.js";
var sql_check_table = "SELECT name FROM sqlite_master WHERE type='table' and name='st_ugh'";

function q(sql, params, next) {
  var ret;
  if ('function' == typeof(params)) {
    next = params;
    ret = db.exec(sql);
  } else {
    var stmt = db.prepare(sql, params);
    if (stmt.step()) {
      ret = stmt.getAsObject();
    }
  };
  if (ret && ret.length > 0) ret = ret[0].values;
  if (next) next(null, ret);
}

function setup(scripts, next) {
  var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
  if (tables[0]) {
    tables[0].values.forEach(function(tg) {
      var table = tg[0];
      if (table.match(/^st_/)) {
        var command = "drop table " + table + ";";
        db.exec(command);
      }
    });
  }
  next(null, require('../index')(driver, scripts));
}

test('(' + dname + ') complain if no scripts supplied', function(t) {
  t.plan(2);
  setup([], function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(0, function(err, level, next) {
      t.ok(err, 'ensure should complain if no scripts');
    });
  });
});

test('(' + dname + ') create table if not present', function(t) {
  t.plan(3);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(0, function(err, level) {
      t.error(err, 'ensure should not error, even with migrate table missing');
      t.equal(0, level, 'should now be at level 0');
    });
  });
});

test('(' + dname + ') run a real script', function(t) {
  t.plan(5);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(1, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 1, 'should now be at level 1');
      q(sql_check_table, function(err, tables) {
        t.error(err, 'query should not error');
        t.ok(tables && tables.length > 0, 'created table');
      });
    });
  });
});

test('(' + dname + ') run multiple levels', function(t) {
  t.plan(6);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(2, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 2, 'should now be at level 2');
      q(sql_check_table, function(err, tables) {
        t.ok(tables && tables.length > 0, 'created table');
        q("SELECT aa from st_ugh", function(err, value) {
          t.error(err, 'select should not error');
          t.equal(value[0][0], 2, 'fetched correct stored value');
        });
      });
    });
  });
});

test('(' + dname + ') multiple statements per level', function(t) {
  t.plan(7);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(3, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 3, 'should now be at level 3');
      q(sql_check_table, function(err, tables) {
        t.ok(tables && tables.length > 0, 'created table');
        q("SELECT aa from st_ugh order by aa asc", function(err, value) {
          t.equal(value.length, 2, 'fetched correct number of rows');
          t.equal(value[0][0], 3, 'fetched correct updated value');
          t.equal(value[1][0], 99, 'fetched correct added value');
        });
      });
    });
  });
});

test('(' + dname + ') ensure all available patches are applied', function(t) {
  t.plan(7);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 3, 'should now be at level 3');
      q(sql_check_table, function(err, tables) {
        t.ok(tables && tables.length > 0, 'created table');
        q("SELECT aa from st_ugh order by aa asc", function(err, value) {
          t.equal(value.length, 2, 'fetched correct number of rows');
          t.equal(value[0][0], 3, 'fetched correct updated value');
          t.equal(value[1][0], 99, 'fetched correct added value');
        });
      });
    });
  });
});

test('(' + dname + ') no patches are applied if already beyond', function(t) {
  t.plan(7);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    q(driver._create_sql, function(err) {
      t.error(err, 'create should not error');
      q(driver._update_sql, { $level: 4 }, function(err) {
        t.error(err, 'update should not error');
        migrate.ensure(function(err, level) {
          t.error(err, 'ensure should not error');
          q(driver._current_sql, function(err, values) {
            t.error(err, 'get current should not error');
            t.equal(values[0][0], 4, 'should now be at level 4');
            q(sql_check_table, function(err, tables) {
              t.notok(tables && tables.length > 0, 'table not created');
            });
          });
        });
      });
    });
  });
});
