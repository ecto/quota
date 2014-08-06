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

exports['foo'] = function (test) {
  test.equal('foo', 'foo');

  setInterval(function () {
    request(url, function (err, res, body) {
      console.log(body);
    });
  }, 100);

  setTimeout(function () {
    // cleanup
    test.end();
    server.close();
    client.end();
  }, 5000);
};
