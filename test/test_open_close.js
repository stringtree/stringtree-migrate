/*jslint node: true */
"use strict";

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

test('raw open then close', function(t) {
  var connection = mysql.createConnection(credentials);
  connection.connect(function(err) {
    if (err) throw(err);
    console.log('connected as id ' + connection.threadId);
    connection.end();
    t.end();
  });
});

test('raw open then close again', function(t) {
  var connection = mysql.createConnection(credentials);
  connection.connect(function(err) {
    if (err) throw(err);
    console.log('connected as id ' + connection.threadId);
    connection.end();
    t.end();
  });
});

var pool;
test('create pool', function(t) {
  pool = mysql.createPool(credentials);
  t.end();
});

test('pool open then close', function(t) {
  pool.getConnection(function(err, connection) {
    if (err) throw(err);
    console.log('connected as id ' + connection.threadId);
    connection.release();
    t.end();
  });
});

test('pool open then close again', function(t) {
  pool.getConnection(function(err, connection) {
    if (err) throw(err);
    console.log('connected as id ' + connection.threadId);
    connection.release();
    t.end();
  });
});

test('destroy pool', function(t) {
  pool.end(function(err) {
    if (err) throw(err);
    t.end();
  });
});
