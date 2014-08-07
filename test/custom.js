var Quota = require('../');

var redis = require('redis');
var request = require('request');
var express = require('express');
var app = express();
var server = app.listen(3000);
var url = 'http://localhost:3000/';
var client = redis.createClient();

var ratelimit = new Quota({
  client: client,
  cap: 100,
  window: 10
});

app.get('/', ratelimit, function(req, res){
  res.send({
    success: true
  });
});

exports['should allow custom 200 hits through'] = function (test) {
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
        test.equal(successes, 100);
        clearInterval(interval);
        test.done();
      }
    });
  }, 10);
};

exports['should reallow connections after custom 10 seconds'] = function (test) {
  console.log('please wait 10 seconds for custom window to be tested...');

  setTimeout(function () {
    request({
      url: url,
      json: true
    }, function (err, res, body) {
      test.equal(body.success, true);
      test.done();
      done();
    });
  }, 10000);
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
