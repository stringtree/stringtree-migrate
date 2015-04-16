/*jslint node: true */
"use strict";

var async = require('async');
var util = require('util');

module.exports = function(driver, scripts) {

  function apply(from, to, next) {
    var hwm;
    async.forEachSeries(scripts, function(script, done) {
      if (script.level > from && (to == null || script.level <= to)) {
        hwm = script.level;
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
      return next(err, hwm || from);
    });
  }
  
  return {
    ensure: function ensure(target, next) {
      var self = this;

      if (!driver) return next(new Error('No db driver supplied. usage: require("stringtree-migrate")(db_driver, scripts);'));
      if (!scripts || 0 === scripts.length) return next(new Error('No migration scripts supplied. usage: require("stringtree-migrate")(db_driver, scripts);'));
      if ('function' === typeof(target)) {
        next = target;
        target = null;
      }

      driver.open(function(err) {
        if (err) return next(err);
        driver.check(function(err, present) {
          if (!present) {
            driver.create(function(err) {
              if (err) return give(next, err);
              apply(0, target, function(err, level) {
                next(err, level);
              });
            });
          } else {
            driver.current(function(err, level) {
              if (err) return next(err);
              apply(level || 0, target, function(err, level) {
                next(err, level);
              });
            });
          }
        });
      });
    }
  };
}