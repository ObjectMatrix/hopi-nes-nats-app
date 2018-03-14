const day = 24 * 60 * 60 * 1000;

module.exports = {
  server: {
    port: process.env.PORT || 3000
  },
  auth: {
    session: {
      expiry: process.env.CHAT_APP_AUTH_SESSION_EXPIRY || (3 * day)
    },
    cookie: {
      password: process.env.CHAT_APP_AUTH_COOKIE_PASSWORD || 'password-must-be-at-least-32-characters',
      isSecure: false
    }
  }
}
