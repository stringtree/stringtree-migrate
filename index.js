/*jslint node: true */
"use strict";

var async = require('async');
var util = require('util');

module.exports = function(driver, scripts) {
  if (!driver) throw new Error('No db driver supplied. usage: require("stringtree-migrate")(db_driver, scripts);');
  if (!scripts || 0 === scripts.length) throw new Error('No migration scripts supplied. usage: require("stringtree-migrate")(db_driver, scripts);');
  
  return {
    give: function give(next, err, value) {
      driver.close(function() {
        return next(err, value);
      });
    },

    apply: function(from, to, next) {
      async.forEachSeries(scripts, function(script, done) {
        if (script.level > from && script.level <= to) driver.execute(script.up, done);
      }, function(err) {
        if (err) return give(next, err);
        give(next, null, to);
      });
    },

    ensure: function ensure(target, next) {
      driver.open(function(err) {
        if (err) return next(err);
        driver.execute('select level from migrations order by level desc', function(err, levels) {
          if (err || 0 === levels.length) {
            // assume all errors are 'missing table' for now
            driver.execute("create table migrations ( level int );", function(err) {
              if (err) return give(next, err);
              return apply(0, target, function(err) {
                give(next, err, target);
              });
            });
          }
          apply(levels[0], target, function(err) {
            give(next, err, target);
          });
        });
      });
    }
  };
}