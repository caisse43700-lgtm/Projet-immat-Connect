#!/usr/bin/env node
/**
 * scripts/preflight-inline-js.mjs
 *
 * Préflight statique : extrait tous les scripts inline de index.html,
 * détecte les guillemets typographiques utilisés comme délimiteurs JS,
 * et vérifie la syntaxe de chaque bloc. Échoue avant E2E si un problème
 * est trouvé, avec numéro de script et ligne exacte.
 *
 * Usage : node scripts/preflight-inline-js.mjs [chemin/vers/index.html]
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const htmlPath = process.argv[2] || path.join(__dirname, '..', 'index.html');
const html = readFileSync(htmlPath, 'utf8');

// ── Extraction des scripts inline (hors src=) ────────────────────────────────
const scriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/g;
const scripts = [];
let m;
while ((m = scriptRegex.exec(html)) !== null) {
  scripts.push({ index: scripts.length, code: m[1], offset: m.index });
}

// ── Détection des guillemets typographiques ──────────────────────────────────
// U+2018 ‘ (left single)  U+2019 ’ (right single)
// U+201C “ (left double)  U+201D ” (right double)
const CURLY = /[‘’“”]/g;

function stripComments(code) {
  // Remove // line comments and /* block comments */ — preserves line count via newlines
  return code
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, m => ' '.repeat(m.length));
}

function detectCurlyDelimiters(code, scriptIndex) {
  const issues = [];
  // Strip comments so apostrophes in comments don't trigger false positives
  const stripped = stripComments(code);
  const lines = stripped.split('\n');
  const originalLines = code.split('\n');
  lines.forEach((line, lineIdx) => {
    // Ignore segments inside double-quoted strings
    const segments = line.split(/"[^"]*"/g);
    const found = segments.join('').match(CURLY);
    if (found) {
      issues.push({
        scriptIndex,
        line: lineIdx + 1,
        chars: found,
        context: originalLines[lineIdx].trim().slice(0, 120),
      });
    }
  });
  return issues;
}

// ── Vérification syntaxique ──────────────────────────────────────────────────
function checkSyntax(code, scriptIndex) {
  try {
    new Function(code);
    return null;
  } catch (e) {
    return e.message;
  }
}

// ── Rapport ─────────────────────────────────────────────────────────────────
let totalIssues = 0;
let totalSyntaxFails = 0;
const report = [];

for (const { index, code } of scripts) {
  const curly = detectCurlyDelimiters(code, index);
  const syntaxErr = checkSyntax(code, index);

  if (curly.length > 0 || syntaxErr) {
    report.push({ index, curly, syntaxErr });
    totalIssues += curly.length;
    if (syntaxErr) totalSyntaxFails++;
  }
}

// ── Sortie ───────────────────────────────────────────────────────────────────
if (report.length === 0) {
  console.log(`✓ preflight-inline-js: ${scripts.length} scripts OK — aucun guillemet typographique, syntaxe valide.`);
  process.exit(0);
}

console.error(`\n✗ preflight-inline-js: ${scripts.length} scripts analysés — ${report.length} script(s) avec problème.\n`);

for (const { index, curly, syntaxErr } of report) {
  console.error(`── Script #${index} ──────────────────────────────────────`);

  if (syntaxErr) {
    console.error(`  SYNTAXE : ${syntaxErr}`);
  }

  if (curly.length > 0) {
    const byLine = {};
    for (const issue of curly) {
      (byLine[issue.line] = byLine[issue.line] || []).push(issue);
    }
    for (const [lineNum, issues] of Object.entries(byLine)) {
      const chars = [...new Set(issues.flatMap(i => i.chars))].join(' ');
      console.error(`  CURLY   ligne ${lineNum}: ${chars}`);
      console.error(`          ${issues[0].context}`);
    }
  }
  console.error('');
}

console.error(`Résumé : ${totalSyntaxFails} erreur(s) de syntaxe, ${totalIssues} guillemet(s) typographique(s).`);
console.error('Corriger avant de lancer les tests E2E.\n');
process.exit(1);
