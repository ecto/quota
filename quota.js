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
  var ip = req.ip;
  var route = req.route.path;

  var hash = crypto.createHash('sha256').update(ip);

  if (this.perRoute) {
    hash.update(route);
  }

  hash = hash.digest('hex');

  var that = this;
  var now = +new Date();
  var key = this.keyPrefix + hash;

  // get the count,
  // or initialize it
  that.client.get(key, function (err, count) {
    if (err) {
      throw err;
    }

    if (!count) {
      count = 0;
    } else {
      count = parseInt(count);
    }

    // increment the count
    count += 1;

    // get the ttl,
    // or initialize it
    that.client.pttl(key, function (err, ttl) {
      if (err) {
        throw err;
      }

      if (ttl < 0) {
        ttl = that.window * 1000;
      }

      // set the count,
      // and the latest ttl
      that.client.psetex(key, ttl, count, function (err) {
        if (err) {
          throw err;
        }

        if (that.injectHeaders) {

        }

        if (count > that.cap) {
          if (err) {
            throw err;
          }

          return res.send({
            success: false,
            error: that.limitError
          });
        }

        next();
      });
    });
  });
};
