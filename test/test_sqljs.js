var test = require('tape');
var util = require('util');

var sqljs = require('sql.js');
var db = new sqljs.Database();
var driver = require('../drivers/driver-for-sqljs')(db);

var dfl_scripts = [
  { level: 1, up: 'create table ugh ( aa int );' },
  { level: 2, up: 'insert into ugh (aa) values (2);' }
];

function setup(scripts, next) {
  var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
  if (tables[0]) {
    tables[0].values.forEach(function(tg) {
      var table = tg[0];
      var command = "drop table " + table + ";";
      db.exec(command);
    });
    var after = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
  }
  next(null, require('../index')(driver, scripts));
}

test('(sql.js) complain if no scripts supplied', function(t) {
  t.plan(1);
  setup([], function(err, migrate) {
    migrate.ensure(0, function(err, level) {
      t.ok(err, 'ensure should complain if no scripts');
    });
  });
});

test('(sql.js) create table if not present', function(t) {
  t.plan(2);
  setup(dfl_scripts, function(err, migrate) {
    migrate.ensure(0, function(err, level) {
      t.error(err, 'ensure should not error, even with migrate table missing');
      t.equal(0, level);
    });
  });
});

test('(sql.js) run a real script', function(t) {
  t.plan(3);
  setup(dfl_scripts, function(err, migrate) {
    migrate.ensure(1, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(1, level);
      var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' and name='ugh';");
      t.ok(tables[0], 'created table');
    });
  });
});

test('(sql.js) run multiple scripts', function(t) {
  t.plan(4);
  setup(dfl_scripts, function(err, migrate) {
    migrate.ensure(2, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(2, level);
      var tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' and name='ugh';");
      t.ok(tables[0], 'created table');
      var value = db.exec("SELECT aa from ugh;");
      t.equal(value[0].values[0][0], 2, 'fetched correct stored value');
    });
  });
});
