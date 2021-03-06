'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const { noop } = require('lodash');
const requests = require('../lib/requests');

describe('requests', () => {
  describe('extend', () => {
    it('should extend the requests object', () => {
      const req = {};
      requests.extend(req, {}, noop);

      assert(req.isAuthenticated);
      assert(typeof req.isAuthenticated === 'function');
      assert(req.isUnauthenticated);
      assert(typeof req.isUnauthenticated === 'function');
      assert(req.login);
      assert(typeof req.login === 'function');
      assert(req.logIn);
      assert(typeof req.logIn === 'function');
      assert(req.logout);
      assert(typeof req.logout === 'function');
      assert(req.logOut);
      assert(typeof req.logOut === 'function');
    });

    it('should call the `next` function once', () => {
      let called = 0;
      const next = () => {
        called = called + 1;
      };
      requests.extend({}, {}, next);

      assert(called === 1);
    });
  });
});
