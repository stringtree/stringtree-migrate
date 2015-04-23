/*jslint node: true */
"use strict";

var test = require('tape');
var util = require('util');
var async = require('async');

var sqljs = require('sql.js');
var db = new sqljs.Database();

var testsuite = require('stringtree-migrate-driver-testsuite');

var driver = require('../drivers/stringtree-migrate-driver-sqljs')({ database: db });

/** general purpose db wrapper to use when verifying what the driver has (or has not) done */
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

/** a function to pass to the conformance tests, so they can reset the db before each test
 * This one just drops the migrations table used by this driver
 */
function setup(next) {
  q("drop table if exists st_migrate", function(err) {
    return next(err, driver);
  });
}

/** run the standard conformance tests against this driver */
testsuite(driver, "sqljs", setup);

/** test the driver-specific bits */
test('(sqljs) execute some sql', function(t) {
  t.plan(5);
  driver.execute('create table st_zz ( name varchar(20) )', function(err) {
    t.error(err, 'execute create should not error');
    driver.execute('insert into st_zz ( name ) values ( "Frank" )', function(err) {
      t.error(err, 'execute insert should not error');
      q('select name from st_zz', function(err, values) {
        t.error(err, 'db select should not error');
        t.equal(values[0][0], 'Frank', 'db tools should find the correct stored value');
        q('drop table st_zz', function(err) {
          t.error(err, 'db drop table should not error');
        });
      });
    });
  });
});
