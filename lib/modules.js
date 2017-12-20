'use strict';

module.exports = {
  load,
};

/**
 * Module dependencies.
 */

const { assign, reduce } = require('lodash');

const debug = require('debug')('character:authentication:modules');

/**
 * Create a hash table of authenticator modules
 *
 * @param {Object} authenticators
 * @return {Object}
 */
function load(authenticators) {
  return reduce(
    authenticators,
    (result, authenticator, name) => {
      const module = authenticator.module; // the module name
      try {
        return assign({}, result, {
          [name]: require(module),
        });
      } catch (error) {
        const message = `module \`${
          module
        }\` not installed for authenticator \`${name}\``;
        if (process.env.NODE_ENV === 'production') {
          throw new Error(message);
        } else {
          debug(message);
          return result;
        }
      }
    },
    {},
  );
}
