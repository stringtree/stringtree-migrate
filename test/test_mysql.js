var test = require('tape');
var util = require('util');
var async = require('async');

var mysql = require('mysql');
var credentials = {
  host     : process.env.MYSQL_TEST_HOST     || 'localhost',
  port     : process.env.MYSQL_TEST_PORT     || 3306,
  user     : process.env.MYSQL_TEST_USER     || 'test',
  password : process.env.MYSQL_TEST_PASSWORD || 'test',
  database : process.env.MYSQL_TEST_DATABASE || 'test'
};
var driver = require('../drivers/stringtree-migrate-driver-mysql')(mysql, credentials);

var dfl_scripts = [
  { level: 1, up: 'create table ugh ( aa int )' },
  { level: 2, up: 'insert into ugh (aa) values (2)' },
  { level: 3, up: [ 'update ugh set aa=3 where aa=2', 'insert into ugh (aa) values (99)' ] }
];

function setup(scripts, next) {
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
          var tname = table.Tables_in_test;
          var sql = "drop table " + tname;
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

test('(mysql) complain if no scripts supplied', function(t) {
  t.plan(2);
  setup([], function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(0, function(err, level) {
      t.ok(err, 'ensure should complain if no scripts');
    });
  });
});

test('(mysql) create table if not present', function(t) {
  t.plan(3);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(0, function(err, level) {
      t.error(err, 'ensure should not error, even with migrate table missing');
      t.equal(0, level, 'should now be at level 0');
    });
  });
});

test('(mysql) run a real script', function(t) {
  t.plan(5);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(1, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 1, 'should now be at level 1');
      driver.execute("show tables like 'ugh'", function(err, tables) {
        t.error(err, 'query should not error');
        t.ok(tables && tables.length > 0, 'created table');
      });
    });
  });
});

test('(mysql) run multiple levels', function(t) {
  t.plan(6);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(2, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 2, 'should now be at level 2');
      driver.execute("show tables like 'ugh'", function(err, tables) {
        t.ok(tables && tables.length > 0, 'created table');
        driver.execute("SELECT aa from ugh", function(err, value) {
          t.error(err, 'select should not error');
          t.equal(value[0].aa, 2, 'fetched correct stored value');
        });
      });
    });
  });
});

test('(mysql) multiple statements per level', function(t) {
  t.plan(6);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(3, function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 3, 'should now be at level 3');
      driver.execute("show tables like 'ugh'", function(err, tables) {
        t.ok(tables && tables.length > 0, 'created table');
        driver.execute("SELECT aa from ugh order by aa asc", function(err, value) {
          t.equal(value[0].aa, 3, 'fetched correct updated value');
          t.equal(value[1].aa, 99, 'fetched correct added value');
        });
      });
    });
  });
});

test('(mysql) ensure all available patches are applied', function(t) {
  t.plan(6);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    migrate.ensure(function(err, level) {
      t.error(err, 'ensure should not error');
      t.equal(level, 3, 'should now be at level 3');
      driver.execute("show tables like 'ugh'", function(err, tables) {
        t.ok(tables && tables.length > 0, 'created table');
        driver.execute("SELECT aa from ugh order by aa asc", function(err, value) {
          t.equal(value[0].aa, 3, 'fetched correct updated value');
          t.equal(value[1].aa, 99, 'fetched correct added value');
        });
      });
    });
  });
});

test('(mysql) no patches are applied if already beyond', function(t) {
  t.plan(6);
  setup(dfl_scripts, function(err, migrate) {
    t.error(err, 'setup should not error');
    driver.create(function(err) {
      t.error(err, 'create should not error');
      driver.update(4, function(err) {
        t.error(err, 'update should not error');
        migrate.ensure(function(err, level) {
          t.error(err, 'ensure should not error');
          t.equal(level, 4, 'should now be at level 4');
          driver.execute("show tables like 'ugh'", function(err, tables) {
            t.notok(tables && tables.length > 0, 'table not created');
          });
        });
      });
    });
  });
});

test('(mysql) finish off', function(t) {
  driver.close(function(err) {
    t.error(err, 'driver close should not error');
    console.log('closed driver, ending tests');
    t.end();
  });
})
