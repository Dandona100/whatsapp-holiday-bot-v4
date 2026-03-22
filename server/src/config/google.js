module.exports = {
  oauth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/contacts/import/google/callback',
  },
  scopes: ['https://www.googleapis.com/auth/contacts.readonly'],
};
