/*jslint node: true */
"use strict";

var async = require('async');
var util = require('util');

module.exports = function(driver, scripts) {

  function give(next, err, value) {
    console.log('give err=' + err + ' value=' + value);
    return next(err, value);
  }

  function apply(from, to, next) {
    console.log('apply from=' + from + ' to=' + to);
    async.forEachSeries(scripts, function(script, done) {
      console.log('considering script=' + util.inspect(script));
      if (script.level > from && script.level <= to) {
        console.log('apply script=' + util.inspect(script));
        driver.execute(script.up, function(err) {
          if (err) return next(err);
          driver.update(script.level, done);
        });
      } else {
        done();
      }
    }, function(err) {
      if (err) return give(next, err);
      give(next, null, to);
    });
  }
  
  return {
    ensure: function ensure(target, next) {
      var self = this;

      if (!driver) return next(new Error('No db driver supplied. usage: require("stringtree-migrate")(db_driver, scripts);'));
      if (!scripts || 0 === scripts.length) return next(new Error('No migration scripts supplied. usage: require("stringtree-migrate")(db_driver, scripts);'));

      driver.open(function(err) {
        if (err) return next(err);
        driver.check(function(err, present) {
          if (!present) {
            console.log('table not present, creating...')
            driver.create(function(err) {
              if (err) return give(next, err);
              apply(0, target, function(err) {
                give(next, err, target);
              });
            });
          } else {
            driver.current(function(err, level) {
              if (err) return next(err);
              apply(level || 0, target, function(err) {
                give(next, err, target);
              });
            });
          }
        });
      });
    }
  };
}