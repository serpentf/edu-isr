// Refuses to start in production with a weak or example JWT secret:
// anyone who knows the secret can forge an admin token.
const PLACEHOLDER_SECRETS = [
  'your-super-secret-jwt-key-change-this-in-production'
];

const assertProductionSecrets = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || PLACEHOLDER_SECRETS.includes(secret)) {
    console.error('❌ JWT_SECRET must be set to a random string of at least 32 characters in production.');
    console.error('   Generate one with: openssl rand -hex 32');
    process.exit(1);
  }
};

module.exports = { assertProductionSecrets };
