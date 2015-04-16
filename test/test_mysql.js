var test = require('tape');
var util = require('util');
var async = require('async');

var mysql = require('mysql');
var credentials = {
  host     : 'localhost',
  user     : 'test',
  password : 'test',
  database : 'test'
};
var driver = require('../drivers/driver-for-mysql')(mysql, credentials);

var dfl_scripts = [
  { level: 1, up: 'create table ugh ( aa int )' },
  { level: 2, up: 'insert into ugh (aa) values (2)' },
  { level: 3, up: [ 'update ugh set aa=3 where aa=2', 'insert into ugh (aa) values (99)' ] }
];

function setup(scripts, next) {
  console.log('setup, open=' + driver.is_open());
  if (!driver.is_open()) {
    driver.open(function(err) {
      if (err) return next(err);
      return setup(scripts, next);
    });
  } else {
    driver.execute("show tables", function(err, tables) {
      if (err) return next(err);
      if (tables && tables.length > 0) {
        async.forEach(tables, function(table, done) {
          console.log('found table: ' + util.inspect(table));
          var tname = table.Tables_in_test;
          var sql = "drop table " + tname;
          console.log('sql: ' + sql);
          driver.execute(sql, function(err) {
            done(err);
          });
        }, function(err) {
          if (err) return next(err);
          return next(null, require('../index')(driver, scripts));
        });
      } else {
        return next(null, require('../index')(driver, scripts));
      }
    });
  }
}

test('complain if no scripts supplied', function(t) {
  t.plan(2);
  setup([], function(err, migrate) {
    console.log('-- complain, setup called back');
    t.error(err, 'setup should not error');
    console.log()
    migrate.ensure(0, function(err, level) {
      t.ok(err, 'ensure should complain if no scripts');
    });
  });
});

test('create table if not present', function(t) {
  t.plan(3);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(0, function(err, level) {
      t.error(err, 'ensure should not error, even with migrate table missing');
      t.equal(0, level, 'shoule now be at level 0');
    });
  });
});

test('run a real script', function(t) {
  t.plan(5);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(1, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(1, level, 'shoule now be at level 1');
      driver.execute("show tables", function(err, tables) {
        t.error(err, 'query should not error');
        t.ok(tables && tables.length > 0, 'created table');
      });
    });
  });
});

test('run multiple levels', function(t) {
  t.plan(5);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(2, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(2, level, 'shoule now be at level 2');
      driver.execute("show tables", function(err, tables) {
        t.ok(tables[0], 'created table');
        driver.execute("SELECT aa from ugh", function(err, value) {
          t.equal(value[0].aa, 2, 'fetched correct stored value');
        });
      });
    });
  });
});

test('finish off', function(t) {
  driver.close(function(err) {
    t.error(err, 'driver close should not error');
    console.log('closed driver, ending tests');
    t.end();
  });
})
