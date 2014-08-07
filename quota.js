var async = require('async');
var crypto = require('crypto');

var defaults = {
  cap: 20,
  window: 60, // in seconds
  perRoute: false,
  keyPrefix: 'QUOTA:',
  injectHeaders: true,
  limitError: 'Your IP address has reached a rate limit'
};

var Quota = module.exports = function (options) {
  if (!options.client) {
    throw new Error('Must pass Redis client into Quota');
  }

  this.client = options.client;

  for (var i in defaults) {
    this[i] = options[i] || defaults[i];
  }

  return this.process.bind(this);
};

Quota.prototype.process = function (req, res, next) {
  var that = this;
  var ip = req.ip;
  var route = req.route.path;
  var now = +new Date();
  var hashMaterial = this.perRoute ? (ip + route) : ip;
  var hash = makeHash(hashMaterial);
  var key = this.keyPrefix + hash;

  async.waterfall([
    function getCount (cb) {
      that.client.get(key, function (err, count) {
        if (err) {
          return cb(err);
        }

        if (!count) {
          count = 0;
        } else {
          count = parseInt(count);
        }

        cb(null, count);
      });
    },

    function incrementCount (count, cb) {
      count += 1;

      cb(null, count);
    },
    
    function getTTL (count, cb) {
      that.client.pttl(key, function (err, ttl) {
        if (err) {
          return cb(err);
        }

        if (ttl < 0) {
          ttl = that.window * 1000;
        }

        cb(null, count, ttl);
      });
    },

    function updateRecord (count, ttl, cb) {
      that.client.psetex(key, ttl, count, function (err) {
        if (err) {
          return cb(err);
        }

        cb(null, count, ttl);
      });
    },

    function injectHeaders (count, ttl, cb) {
      if (!that.injectHeaders) {
        return cb(null, count, ttl);
      }

      cb(null, count, ttl);
    }
  ], function (err, count, ttl) {
    if (err) {
      throw err;
    }

    if (count > that.cap) {
      return res.send({
        success: false,
        error: that.limitError
      });
    }

    next();
  });
};

function makeHash (input) {
  var hash = crypto.createHash('sha256').update(input);
  hash = hash.digest('hex');
  return hash;
}
