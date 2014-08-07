/*
 * I'm sure there's a better way to test this...
 * I couldn't figure out an easier way to code it
 */

var Quota = require('../');

var redis = require('redis');
var request = require('request');
var express = require('express');
var app = express();
var server = app.listen(3000);
var url = 'http://localhost:3000/';
var client = redis.createClient();
var ratelimit = new Quota({
  client: client
});

app.get('/', ratelimit, function(req, res){
  res.send({
    success: true
  });
});

exports['should allow default 20 hits through'] = function (test) {
  var successes = 0;
  resetRedis();

  var interval = setInterval(function () {
    request({
      url: url,
      json: true
    }, function (err, res, body) {
      if (body.success === true) {
        successes++;
      } else {
        test.equal(successes, 20);
        clearInterval(interval);
        test.done();
      }
    });
  }, 10);
};

exports['should reallow connections after 60 seconds'] = function (test) {
  console.log('please wait 60 seconds for default window to be tested...');

  setTimeout(function () {
    request({
      url: url,
      json: true
    }, function (err, res, body) {
      test.equal(body.success, true);
      test.done();
      done();
    });
  }, 60000);
};

function done () {
  server.close();
  client.end();
}

function resetRedis () {
  client.flushall(function (err) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
  });
};
