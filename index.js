/*jslint node: true */
"use strict";

var async = require('async');
var util = require('util');

module.exports = function(driver, scripts) {

  function give(next, err, value) {
    return next(err, value);
  }

  function apply(from, to, next) {
    async.forEachSeries(scripts, function(script, done) {
      if (script.level > from && script.level <= to) {
        var statements = Array.isArray(script.up) ? script.up : [ script.up ];
        async.forEachSeries(statements, function(statement, done) {
          driver.execute(statement, function(err) {
            done(err);
          });
        }, function(err) {
          if (err) done(err);
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