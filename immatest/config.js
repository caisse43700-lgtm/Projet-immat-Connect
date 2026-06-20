'use strict';
const path = require('path');
const fs   = require('fs');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

module.exports = {
  EMAIL_A:  process.env.EMAIL_A  || '',
  PWD_A:    process.env.PWD_A    || '',
  EMAIL_B:  process.env.EMAIL_B  || '',
  PWD_B:    process.env.PWD_B    || '',
  BASE_URL: process.env.BASE_URL || 'https://caisse43700-lgtm.github.io/Projet-immat-Connect/',
  VIEWPORT: { width: 390, height: 844 },
  TIMEOUT:  30_000,
};
