#!/usr/bin/env node
// Creates an admin, or promotes an existing user to admin.
// Usage: node scripts/create-admin.js <email> [name]
// Password: ADMIN_PASSWORD env var; if unset, a random one is generated and printed once.
// The password is never taken from arguments, so it does not end up in shell history.

const crypto = require('crypto');
const { sequelize } = require('../src/config/database');
const { User } = require('../src/models');

const [email, name = 'Администратор'] = process.argv.slice(2);

const main = async () => {
  if (!email || !email.includes('@')) {
    console.error('Usage: node scripts/create-admin.js <email> [name]');
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  await sequelize.authenticate();
  const existing = await User.findOne({ where: { email: normalizedEmail } });

  if (existing) {
    existing.role = 'admin';
    existing.is_active = true;
    if (!generated) existing.password = password;
    await existing.save();
    console.log(`✅ ${normalizedEmail} is now an admin${generated ? ' (password unchanged)' : ' (password updated)'}.`);
  } else {
    await User.create({ email: normalizedEmail, password, name, role: 'admin' });
    console.log(`✅ Admin ${normalizedEmail} created.`);
    if (generated) console.log(`   Password: ${password}  ← save it now, it is not stored anywhere in plain text`);
  }

  await sequelize.close();
};

main().catch((error) => {
  console.error('❌', error.message);
  process.exit(1);
});
