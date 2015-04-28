/*jslint node: true */
"use strict";

var async = require('async');
var util = require('util');

module.exports = function(driver, levels) {

  function apply(from, to, next) {
    var hwm;
    async.forEachSeries(levels, function(level, done) {
      if (level.level > from && (to == null || level.level <= to)) {
        hwm = level.level;
        var statements = Array.isArray(level.up) ? level.up : [ level.up ];
        var script_index = 0;
        async.forEachSeries(statements, function(statement, done) {
          ++script_index;
          driver.execute(statement, function(err) {
            if (err) {
              err.level = level;
              err.script = script_index;
            }
            done(err);
          });
        }, function(err) {
          if (err) return done(err);
          driver.update(level.level, done);
        });
      } else {
        done();
      }
    }, function(err) {
      if (err) return next(err);
      return next(err, hwm || from);
    });
  }
  
  function complain(err, next) {
    if (err) {
      if (next) {
        next(err);
      } else {
        console.log(err);
      }
    }
    return err;
  }
  
  return {
    ensure: function ensure(target, next) {
      var self = this;

      if ('function' === typeof(target)) {
        next = target;
        target = null;
      }

      if (!driver) return complain(new Error('No db driver supplied. usage: require("stringtree-migrate")(db_driver, scripts);'), next);
      if (!levels || 0 === levels.length) return complain(new Error('No migration scripts supplied. usage: require("stringtree-migrate")(db_driver, scripts);'), next);

      driver.open(function(err) {
        if (complain(err, next)) return;

        driver.check(function(err, present) {
          if (complain(err, next)) return;
          if (!present) {
            driver.create(function(err) {
              if (err) {
                driver.close(function(err) {
                  if (complain(err, next)) return;
                });
              } else {
                apply(0, target, function(err, level) {
                  if (complain(err, next)) return;
                  driver.close(function(err) {
                    if (next) next(err, level);
                  });
                });
              }
            });
          } else {
            driver.current(function(err, level) {
              if (complain(err, next)) {
                driver.close(function(err) {
                  if (next) next(err);
                });
              } else {
                if (level < target) {
                  apply(level, target, function(err, level) {
                    if (complain(err, next)) return;
                    driver.close(function(err) {
                      if (next) next(err, level);
                    });
                  });
                } else {
                  driver.close(function(err) {
                    if (next) next(err, level);
                  });
                }
              }
            });
          }
        });
      });
    }
  };
}