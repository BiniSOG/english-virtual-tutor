// Vercel Serverless Function entry — wraps the compiled NestJS app (dist/serverless.js).
module.exports = require('../dist/serverless').default;
