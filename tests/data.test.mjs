// node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { parseCsv, loadData } from '../scripts/data.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

test('parseCsv handles quotes, escaped quotes, commas and newlines in fields, BOM and CRLF', () => {
  const rows = parseCsv('﻿a,b\r\n1,"x, ""y""\nz"\r\n\r\n2,\n');
  assert.deepEqual(rows, [{ a: '1', b: 'x, "y"\nz' }, { a: '2', b: '' }]);
});

test('the shipped data is valid', () => {
  const { db } = loadData(path.join(ROOT, 'data'));
  assert.equal(db.issues.length, 7);
  assert.equal(db.countries.length, 28);
  // The form template special-cases these two names.
  assert.ok(db.issues.some(i => i.category_name === 'Education'));
  assert.ok(db.countries.some(c => c.country_name === 'Malta'));
});

function withData(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsw-'));
  for (const f of ['issues.csv', 'countries.csv', 'parties.csv', 'statements.csv']) {
    fs.writeFileSync(path.join(dir, f), files[f] ?? fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
  }
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true }); }
}

test('loadData reports unknown references and duplicates', () => {
  withData({
    'parties.csv': 'party_id,party_market_code,party_name\n1,xx,A\n2,eu,B\n2,eu,C\n',
    'statements.csv': 'party_id,category_id,comparison_text\n1,1,t\n99,1,t\n2,42,t\n2,1,\n'
  }, dir => {
    assert.throws(() => loadData(dir), err => {
      for (const s of ['unknown party_market_code "xx"', 'duplicate party_id "2"', 'unknown party_id "99"',
                       'unknown category_id "42"', 'needs comparison_text or comparison_text_original']) {
        assert.ok(err.message.includes(s), `missing: ${s}\n${err.message}`);
      }
      return true;
    });
  });
});

// Load the browser shim with a minimal angular stand-in and test the engine directly.
function engine(db) {
  const angular = {
    forEach: (o, fn) => (Array.isArray(o) ? o.forEach(fn) : Object.keys(o).forEach(k => fn(o[k], k))),
    isArray: Array.isArray, extend: Object.assign,
    module: () => ({ config() {} })
  };
  const window = { angular };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'src/shim/wsw-api.js'), 'utf8'),
    { window, document: { addEventListener() {} } });
  return window.WSW_API.makeEngine(db);
}

test('API engine answers the endpoints the bundle calls', () => {
  const { db } = loadData(path.join(ROOT, 'data'));
  const e = engine(db);

  const issues = e['category.getList']({});
  assert.equal(issues[0].category_slug, 'compare/education');
  assert.equal(issues[0].issue_id, issues[0].category_id);

  assert.equal(e['world.getMarkets']({})[0].country_name, 'Austria');

  const eu = e['party.getList']({ market_code: 'eu' });
  assert.ok(eu.length > 0 && eu.every(p => p.party_market_code === 'eu'));

  // a single code arrives as a string, several as an array
  assert.deepEqual(e['party.getList']({ 'market_codes[]': 'de' }).map(p => p.party_market_code), ['de']);
  const nat = e['party.getList']({ 'market_codes[]': ['it', 'de'] });
  assert.deepEqual(nat.map(p => p.party_market_code), ['de', 'it', 'it'], 'national parties ordered by country');

  const all = e['party.getList']({});
  assert.equal(all.length, db.parties.length);

  const rows = e['comparison.build']({ 'key_issues[]': ['2', '1'], 'party_ids[]': ['9101', '9001', '9201'] });
  assert.deepEqual(rows.map(r => [r.category_name, r.party_name]), [
    ['Education', 'Sample European Party A'],
    ['Employment', 'Beispielpartei'],
    ['Employment', 'Partito di Esempio'],
    ['Employment', 'Sample European Party A']
  ]);
  for (const r of rows) assert.equal(r.comparison_market_code, r.party_market_code);
  assert.ok(rows[2].comparison_text_original.startsWith('[Esempio]'));

  assert.deepEqual(e['comparison.build']({ 'key_issues[]': '7', 'party_ids[]': '9301' }), []);
});
