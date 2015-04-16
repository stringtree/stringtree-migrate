var test = require('tape');
var util = require('util');
var async = require('async');

var mysql = require('mysql');
var credentials = {
  host     : 'localhost',
  user     : 'tes',
  password : 'tes',
  database : 'tes'
};
var driver = require('../drivers/driver-for-mysql')(mysql, credentials);

var dfl_scripts = [
  { level: 1, up: 'create table ugh ( aa int );' },
  { level: 2, up: 'insert into ugh (aa) values (2);' }
];

function setup(scripts, next) {
  var db = mysql.createConnection(credentials);

  db.query("show tables", function(err, tables) {
    if (err) return next(err);
    if (tables.length > 0) {
      async.forEach(tables, function(table, done) {
        console.log('found table: ' + util.inspect(table));
        var tname = table.Tables_in_tes;
        var sql = "drop table " + tname;
        console.log('sql: ' + sql);
        db.query(sql, function(err) {
          done(err);
        });
      }, function(err) {
        if (err) return next(err);
        next(null, db, require('../index')(driver, scripts));
      });
    } else {
      next(null, db, require('../index')(driver, scripts));
    }
  });
}

test('complain if no scripts supplied', function(t) {
  t.plan(2);
  setup([], function(err, db, migrate) {
    t.error(err, 'setup should not error');
    console.log()
    migrate.ensure(0, function(err, level) {
      t.ok(err, 'ensure should complain if no scripts');
    });
  });
});

test('create table if not present', function(t) {
  t.plan(3);
  setup(dfl_scripts, function(err, db, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(0, function(err, level) {
      t.error(err, 'ensure should not error, even with migrate table missing');
      t.equal(0, level);
    });
  });
});

test('run a real script', function(t) {
  t.plan(4);
  setup(dfl_scripts, function(err, db, migrate) {
    migrate.ensure(1, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(1, level);
      db.query("show tables", function(err, tables) {
        t.error(err, 'query should not error');
        t.ok(tables.length > 0, 'created table');
      });
    });
  });
});

test('run multiple scripts', function(t) {
  t.plan(4);
  setup(dfl_scripts, function(err, db, migrate) {
    migrate.ensure(2, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(2, level);
      db.query("show tables", function(err, tables) {
        t.ok(tables[0], 'created table');
        db.query("SELECT aa from ugh", function(err, value) {
          t.equal(value[0].aa, 2, 'fetched correct stored value');
        });
      });
    });
  });
});

test('finish off', function(t) {
  setup(dfl_scripts, function(err, db, migrate) {
    db.end(function(err) {
      console.log('db end called back, ending tests');
//      db.destroy();
      t.end();
    });
  });
})
