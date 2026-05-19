const fs = require('fs');

// Vercel के Environment Variables को config.js में बदलता है
const configContent = `
window.SECRETS = {
  FIREBASE_CONFIG: {
    apiKey: "${process.env.FIREBASE_API_KEY}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
    databaseURL: "${process.env.FIREBASE_DATABASE_URL}",
    projectId: "${process.env.FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.FIREBASE_APP_ID}",
    measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"
  },
  PING_PROXY_URL: "${process.env.PING_PROXY_URL}",
  SUPER_PASS: "${process.env.SUPER_PASS}"
};
`;

fs.writeFileSync('./config.js', configContent);
console.log('Success: config.js generated from Vercel Env Variables');