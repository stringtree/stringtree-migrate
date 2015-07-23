/*jslint node: true */
"use strict";

var async = require('async');
var util = require('util');

var DOIT = 'DOIT';
var CHECK = 'CHECK';

module.exports = function(driver, levels) {

  function apply(from, to, dry_run, next) {
    var hwm;
    async.forEachSeries(levels, function(level, done) {
      if (level.level > from && (to == null || level.level <= to)) {
        hwm = level.level;
        if (dry_run) return done();
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
      return next(err, hwm || from);
    });
  }

  function update(target, mode, next) {
    driver.check(function(err, present) {
      if (err) return next(err);
      if (!present) {
        driver.create(function(err) {
          if (err) return next(err);
          apply(0, target, mode === CHECK, function(err, hwm) {
            if (err) return next(err);
            if (mode === CHECK) {
              err = new Error('Database is at level 0 but should be at level ' + hwm);
            }
            next(err, hwm);
          });
        });
      } else {
        driver.current(function(err, level) {
          if (err) return next(err);
          if (mode === CHECK && target != null && level < target) {
            return next(new Error('Database is at level ' + level + ' but should be at level ' + target));
          }
          if (target == null || level < target) {
            apply(level, target, mode === CHECK, function(err, hwm) {
              if (err) return next(err);
              if (mode === CHECK && hwm > level) {
                err = new Error('Database is at level ' + level + ' but should be at level ' + hwm);
              }
              next(err, hwm);
            });
          } else {
            return next(err, level);
          }
        });
      }
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

  function action(target, mode, next) {
    if (!driver) return complain(new Error('No db driver supplied. usage: require("stringtree-migrate")(db_driver, scripts);'), next);
    if (!levels || 0 === levels.length) return complain(new Error('No migration scripts supplied. usage: require("stringtree-migrate")(db_driver, scripts);'), next);

    driver.open(function(err) {
      if (complain(err, next)) return;
      update(target, mode, function(err, level) {
        driver.close(function() {
          if (next) {
            next(err, level);
          } else {
            console.log(err);
          }
        });
      });
    });
  }
  
  return {
    ensure: function ensure(target, next) {
      if ('function' === typeof(target)) {
        next = target;
        target = null;
      }
      return action(target, DOIT, next);
    },
    check: function check(target, next) {
      if ('function' === typeof(target)) {
        next = target;
        target = null;
      }
      return action(target, CHECK, next);
    }
  };
}