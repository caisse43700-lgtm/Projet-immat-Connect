'use strict';
const { chromium } = require('playwright');
const cfg = require('../config');

let _browser = null;

async function launch() {
  _browser = await chromium.launch({ headless: false, slowMo: 300 });
  return _browser;
}

async function newPage(browser) {
  const ctx = await browser.newContext({
    viewport: cfg.VIEWPORT,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'fr-FR',
    geolocation: { latitude: 45.75, longitude: 4.85 },
    permissions: ['geolocation', 'notifications'],
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(cfg.TIMEOUT);
  page.on('console', msg => {
    if (msg.type() === 'error') page._immaErrors = (page._immaErrors || []).concat(msg.text());
  });
  page._immaErrors = [];
  return page;
}

async function close() {
  if (_browser) { await _browser.close(); _browser = null; }
}

module.exports = { launch, newPage, close };
