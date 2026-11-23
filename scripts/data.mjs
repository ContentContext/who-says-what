// Reads and validates the CSV files in data/. Used by the build and the tests.
// The format is documented in docs/data-format.md.
import fs from 'node:fs';
import path from 'node:path';

// RFC 4180 CSV: quoted fields, "" escapes, newlines inside quotes, optional BOM.
export function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const rows = [];
  let row = [], field = '', i = 0, quoted = false;
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { quoted = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (quoted) throw new Error('unterminated quoted field');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter(r => r.some(v => v.trim() !== ''));
  const [header, ...body] = nonEmpty;
  return body.map((r, n) => {
    if (r.length > header.length) throw new Error(`row ${n + 2}: ${r.length} fields, header has ${header.length}`);
    return Object.fromEntries(header.map((h, k) => [h.trim(), (r[k] ?? '').trim()]));
  });
}

function read(dir, file) {
  const p = path.join(dir, file);
  try { return parseCsv(fs.readFileSync(p, 'utf8')); }
  catch (e) { throw new Error(`${file}: ${e.message}`); }
}

export function loadData(dir) {
  const errors = [], warnings = [];
  const need = (file, n, row, cols) => cols.forEach(c => { if (!row[c]) errors.push(`${file} row ${n + 2}: "${c}" is empty`); });
  const unique = (file, rows, key) => {
    const seen = new Set();
    rows.forEach((r, n) => { if (seen.has(r[key])) errors.push(`${file} row ${n + 2}: duplicate ${key} "${r[key]}"`); seen.add(r[key]); });
  };

  const issues = read(dir, 'issues.csv').map((r, n) => {
    need('issues.csv', n, r, ['category_id', 'category_slug', 'category_name']);
    if (r.category_slug && !/^[a-z0-9-]+$/.test(r.category_slug)) errors.push(`issues.csv row ${n + 2}: category_slug may only use a-z, 0-9 and "-"`);
    return { category_id: r.category_id, category_slug: r.category_slug, category_name: r.category_name };
  });
  unique('issues.csv', issues, 'category_id'); unique('issues.csv', issues, 'category_slug');

  const countries = read(dir, 'countries.csv').map((r, n) => {
    need('countries.csv', n, r, ['market_id', 'market_code', 'country_name']);
    return { market_id: r.market_id, market_code: r.market_code, country_name: r.country_name };
  });
  unique('countries.csv', countries, 'market_code');
  let sampleRows = 0;
  const codes = new Set(countries.map(c => c.market_code).concat('eu'));

  const parties = read(dir, 'parties.csv').map((r, n) => {
    need('parties.csv', n, r, ['party_id', 'party_market_code', 'party_name']);
    if (r.party_id && !/^[0-9A-Za-z_-]+$/.test(r.party_id)) errors.push(`parties.csv row ${n + 2}: party_id may not contain commas, spaces or "|"`);
    if (r.party_market_code && !codes.has(r.party_market_code)) errors.push(`parties.csv row ${n + 2}: unknown party_market_code "${r.party_market_code}" (use a code from countries.csv, or "eu")`);
    if (/^SAMPLE/.test(r.notes || '')) sampleRows++;
    return { party_id: r.party_id, party_market_code: r.party_market_code, party_name: r.party_name, party_abbreviation: r.party_abbreviation || '' };
  });
  unique('parties.csv', parties, 'party_id');
  // The results page groups by party_name within a country, so names must be unique there.
  const nameKey = new Set();
  parties.forEach((p, n) => {
    const k = p.party_market_code + '|' + p.party_name;
    if (nameKey.has(k)) errors.push(`parties.csv row ${n + 2}: two parties called "${p.party_name}" in "${p.party_market_code}"`);
    nameKey.add(k);
  });

  const issueIds = new Set(issues.map(i => i.category_id));
  const partyIds = new Set(parties.map(p => p.party_id));
  const statements = read(dir, 'statements.csv').map((r, n) => {
    need('statements.csv', n, r, ['party_id', 'category_id']);
    if (!r.comparison_text && !r.comparison_text_original) errors.push(`statements.csv row ${n + 2}: needs comparison_text or comparison_text_original`);
    if (r.party_id && !partyIds.has(r.party_id)) errors.push(`statements.csv row ${n + 2}: unknown party_id "${r.party_id}"`);
    if (r.category_id && !issueIds.has(r.category_id)) errors.push(`statements.csv row ${n + 2}: unknown category_id "${r.category_id}"`);
    if (!r.source_title && !r.source_url) warnings.push(`statements.csv row ${n + 2}: no source given`);
    return {
      party_id: r.party_id, category_id: r.category_id,
      comparison_text: r.comparison_text, comparison_text_original: r.comparison_text_original,
      source_title: r.source_title || '', source_url: r.source_url || ''
    };
  });

  if (errors.length) throw new Error('data errors:\n  ' + errors.join('\n  '));
  if (sampleRows) warnings.push(`${sampleRows} sample part${sampleRows === 1 ? 'y is' : 'ies are'} still in parties.csv (notes column starts with SAMPLE)`);
  return { db: { issues, countries, parties, statements }, warnings };
}
