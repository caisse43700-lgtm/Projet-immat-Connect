'use strict';
const https = require('https');
const cfg = require('../config');

const SUPABASE_URL  = process.env.SUPABASE_URL  || '';
const ANON_KEY      = process.env.ANON_KEY       || '';

async function analyzeFailure(scenarioName, failedChecks, gvcState) {
  if (!SUPABASE_URL || !ANON_KEY) return null;

  const payload = {
    message: `IMMATEST DIAGNOSTIC — scénario "${scenarioName}"\n\nÉchecs:\n${failedChecks.map(c => `- ${c.label}: ${c.detail}`).join('\n')}\n\nGVC state:\n${JSON.stringify(gvcState, null, 2).slice(0, 1000)}`,
    mode: 'diagnostic',
    feature: 'IMMATEST',
    snapshot: { immatest: true, scenario: scenarioName, fails: failedChecks.length },
    history: [],
  };

  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/immat-brain-dialog`);
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          resolve(r.juste || r.sources || r.response || null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

module.exports = { analyzeFailure };
