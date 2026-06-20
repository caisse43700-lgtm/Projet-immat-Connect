'use strict';
const fs   = require('fs');
const path = require('path');

const results = [];
let currentScenario = null;

function scenario(name) {
  currentScenario = { name, checks: [], startAt: Date.now() };
  results.push(currentScenario);
  console.log(`\n▶ ${name}`);
}

function check(label, pass, detail = '') {
  const icon = pass ? '✅' : '❌';
  const entry = { label, pass, detail };
  if (currentScenario) currentScenario.checks.push(entry);
  console.log(`  ${icon} ${label}${detail ? '  — ' + detail : ''}`);
}

function warn(label, detail = '') {
  const entry = { label, pass: null, detail };
  if (currentScenario) currentScenario.checks.push(entry);
  console.log(`  ⚠️  ${label}${detail ? '  — ' + detail : ''}`);
}

function addAiFix(scenarioName, failure, fix) {
  const sc = results.find(r => r.name === scenarioName);
  if (sc) sc.aiFix = { failure, fix };
}

function summary() {
  let total = 0, pass = 0, fail = 0;
  results.forEach(sc => {
    sc.checks.forEach(c => {
      if (c.pass === true)  { total++; pass++; }
      if (c.pass === false) { total++; fail++; }
    });
    sc.duration = Date.now() - sc.startAt;
  });
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`RÉSUMÉ : ${total} vérifications · ${pass} ✅ PASS · ${fail} ❌ FAIL`);
  return { total, pass, fail };
}

function writeHtml() {
  const outDir  = path.join(__dirname, '..', 'report');
  const outFile = path.join(outDir, 'last-run.html');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const date = new Date().toLocaleString('fr-FR');
  const { total, pass, fail } = summary();

  const scenarioRows = results.map(sc => {
    const scPass  = sc.checks.filter(c => c.pass === true).length;
    const scTotal = sc.checks.filter(c => c.pass !== null).length;
    const scFail  = scTotal - scPass;
    const icon    = scFail === 0 ? '✅' : '❌';
    const checks  = sc.checks.map(c => {
      const ci = c.pass === true ? '✅' : c.pass === false ? '❌' : '⚠️';
      return `<li>${ci} ${c.label}${c.detail ? ` <span class="det">${c.detail}</span>` : ''}</li>`;
    }).join('');
    const fix = sc.aiFix ? `<div class="ai-fix"><b>🤖 Analyse IA :</b> ${sc.aiFix.failure}<br><b>Fix :</b> ${sc.aiFix.fix}</div>` : '';
    return `<details ${scFail ? 'open' : ''}><summary>${icon} ${sc.name} <span class="cnt">${scPass}/${scTotal}</span> <span class="dur">${sc.duration}ms</span></summary><ul>${checks}</ul>${fix}</details>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>Immatest — ${date}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0a0f1a;color:#e2e8f0;padding:20px;max-width:800px;margin:0 auto}
  h1{color:#c4b5fd;font-size:1.4em}
  .badge{display:inline-block;padding:4px 10px;border-radius:20px;font-weight:700;font-size:.85em;margin:0 4px}
  .pass{background:#14532d;color:#86efac}.fail{background:#7f1d1d;color:#fca5a5}
  details{background:#0f172a;border:1px solid #1e293b;border-radius:8px;margin:8px 0;padding:0}
  summary{padding:12px 16px;cursor:pointer;font-weight:600;list-style:none}
  summary::-webkit-details-marker{display:none}
  ul{margin:0;padding:8px 16px 12px 32px;line-height:2}
  .cnt{color:#94a3b8;font-weight:400;font-size:.85em;margin-left:8px}
  .dur{color:#475569;font-size:.75em;margin-left:6px}
  .det{color:#64748b;font-size:.85em}
  .ai-fix{background:#1e1b4b;border-left:3px solid #7c6af7;padding:10px 14px;margin:8px 16px 12px;border-radius:0 6px 6px 0;font-size:.85em;line-height:1.6}
</style></head><body>
<h1>🧪 Immatest · ${date}</h1>
<div><span class="badge pass">${pass} ✅ PASS</span><span class="badge fail">${fail} ❌ FAIL</span><span style="color:#64748b;font-size:.85em"> sur ${total} vérifications</span></div>
<hr style="border-color:#1e293b;margin:20px 0">
${scenarioRows}
</body></html>`;

  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`\n📄 Rapport : ${outFile}`);
  return outFile;
}

module.exports = { scenario, check, warn, addAiFix, summary, writeHtml, results };
