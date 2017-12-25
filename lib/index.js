'use strict';

/**
 * Module dependencies.
 */

const { and, check } = require('character/utils');
const { assign, flow, forEach, mapKeys, mapValues, reduce } = require('lodash');
const Plugin = require('character/plugin');
const arrify = require('arrify');
const models = require('./models');
const modules = require('./modules');
const requests = require('./requests');
const sessions = require('./sessions');

const debug = require('debug')('character:authentication');

module.exports = class Authentication extends Plugin {
  define() {
    if (!this.config.isValid) {
      return debug(
        'Invalid configuration. Not attaching authentication plugin. Fix the configuration and restart the server',
      );
    }

    /**
     * Make sure each authenticator has the following properties:
     *  - `failureRedirect`
     *  - `onboardKnownAccounts`
     *  - `successRedirect`
     */
    const authenticators = mapValues(
      this.config.authenticators,
      authenticator =>
        Object.assign(
          {
            failureRedirect: this.config.login,
            onboardKnownAccounts: this.config.onboardKnownAccounts,
            successRedirect: this.config.successRedirect,
          },
          authenticator,
        ),
    );

    // body parsing is currently enabled on all plugin router routes by `CoreFramework`

    // add session-middleware
    const { session, sessionMethods } = sessions.setup(
      this.config,
      this.character.db,
      this.deps.sessionStore,
    );
    this.preRouterMiddleware.push(sessionMethods); // adds `req.character.get/set` for safe access of Character session data
    this.postRouterMiddleware.push(session); // session purposely mounted on `/` for downstream routes, else internal requests to self will generate extra sessions

    // add request methods such as `req.isAuthenticated`
    this.preRouterMiddleware.push(requests.extend);

    // attach authenticators
    this.deps.session = session;
    forEach(modules.load(authenticators), (module, name) => {
      flow(
        arrify, // modules may be a single authenticator or an array of authenticators
        modules =>
          modules.forEach(Module => {
            // TODO test ability to return multiple modules from an authenticator
            const module = new Module(
              name,
              authenticators[name],
              this.deps,
              this.character,
            );
            // TODO do authenticator modules have root middleware as well? (pre- and post-router middleware)
            this.router.use(`/${name}`, module.router);
          }),
      )(module);
    });
  }

  static defaults() {
    return {
      base: '/auth',
      login: '/login',
      onboardKnownAccounts: true,
      successRedirect: '/',
    };
  }

  /**
   * Return models for both this plugin and all authenticators
   *
   * @param {Object} config
   * @return {Object}
   */
  static models(config) {
    const result = reduce(
      modules.load(config.authenticators),
      (models, module, authenticatorName) =>
        assign(
          {},
          models,
          flow(
            arrify, // modules may be a single authenticator or an array of authenticators
            modules =>
              modules.map(
                Module =>
                  Module.models(config.authenticators[authenticatorName]), // pass the authenticator its config
              ),
            models => assign({}, ...models),
            models =>
              mapKeys(
                models,
                (model, modelName) => `${authenticatorName}$${modelName}`, // insert the model into the authenticator models namespace
              ),
            models =>
              mapValues(models, (model, modelName) => {
                if (model.options.tableName) {
                  model.options.tableName = `${authenticatorName}$${
                    model.options.tableName
                  }`; // insert the model into the authenticator models namespace
                }
                return model;
              }),
          )(module),
        ),
      models,
    );
    return result;
  }

  static validateConfig(data) {
    const config = data.plugins.authentication;
    return and(
      check(config, 'missing authentication settings'),
      check(
        config.authenticators && Object.keys(config.authenticators).length > 0,
        'missing authenticators',
      ),
      ...Object.keys(config.authenticators).map(name =>
        validateAuthenticator(name, config.authenticators[name]),
      ),
      check(config.session.cookie.maxAge, 'missing session cookie maximum age'),
      check(config.session.keys, 'missing session secret keys'),
    );
    // TODO check that config.successRedirect exists or that each authenticator has a successRedirect
  }
};

/**
 * Validate an authenticator
 *
 * @param {string} name Authenticator name
 * @param {Object} authenticator
 * @param {string} authenticator.module Module name
 * @return {Boolean}
 */
function validateAuthenticator(name, authenticator) {
  return (
    typeof authenticator === 'object' &&
    check(authenticator.module, `missing module for authenticator \`${name}\``)
  );
  // TODO: for source = local, check that we have a local copy of this file for future re-installs @ authenticator.path
}
