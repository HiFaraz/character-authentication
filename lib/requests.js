'use strict';

module.exports = {
  extend,
};

/**
 * Extends the request objects
 *
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @param {function} next
 * @return {Promise}
 */
function extend(req, res, next) {
  req.isAuthenticated = () => (req.character.get('user') ? true : false);

  req.isUnauthenticated = () => !req.isAuthenticated();

  req.login = user => req.character.set({ user });
  req.logIn = req.login;

  req.logout = () => {
    req.session.destroy();
    res.redirect('/');
  };
  req.logOut = req.logout;

  return next();
}
