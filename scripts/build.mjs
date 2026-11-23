#!/usr/bin/env node
// Builds the static site into dist/.
//
//   BASE      path the site is served from, with leading and trailing slash (default "/")
//   SITE_URL  absolute URL of the site, for social cards (default "https://contentcontext.github.io/who-says-what/")
//
// Steps:
//   1. copy src/static to dist/
//   2. rewrite the original bundle and view templates so their absolute
//      "/js/..." and "/images/..." paths work under BASE, and point the bundle's API at
//      the local data (see src/shim/wsw-api.js)
//   3. validate data/*.csv and write dist/data/wsw.json
//   4. render src/page.html into dist/index.html
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadData } from './data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const BASE = process.env.BASE || '/';
const SITE_URL = process.env.SITE_URL || 'https://contentcontext.github.io/who-says-what/';
const ARCHIVE = 'https://web.archive.org/web/2014/';

if (!BASE.startsWith('/') || !BASE.endsWith('/')) {
  throw new Error(`BASE must start and end with "/" (got "${BASE}")`);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

// Replace `find` with `replace` exactly `count` times, or fail. This keeps the
// edits to the original files explicit, and the build fails loudly if a file changes.
function replaceExact(text, find, replace, count, label) {
  const n = text.split(find).length - 1;
  if (n !== count) throw new Error(`${label}: expected ${count} occurrence(s) of ${JSON.stringify(find)}, found ${n}`);
  return text.split(find).join(replace);
}

fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(ROOT, 'src/static'), DIST);

// --- 2. the original Angular bundle -------------------------------------------------
const bundlePath = path.join(DIST, 'js/comparison-tool.min.js');
let bundle = fs.readFileSync(bundlePath, 'utf8');
const noSlash = BASE.replace(/\/$/, '');
// Route templates: templateUrl:"/js/comparison-tool/views/..."  (8 routes)
bundle = replaceExact(bundle, 'templateUrl:"/js/comparison-tool/views/', `templateUrl:"${BASE}js/comparison-tool/views/`, 8, 'routes');
// ng-include templates for the form and results
bundle = replaceExact(bundle, 'template:"/js/comparison-tool/views/', `template:"${BASE}js/comparison-tool/views/`, 2, 'includes');
// The bundle runs with environment:"dev". Point that environment at local data.
bundle = replaceExact(bundle, 'apiUrl:"http://api2.youngvoters.eu"', 'apiUrl:"wsw://api"', 1, 'apiUrl');
bundle = replaceExact(bundle, 'staticUrl:"http://static2.youngvoters.eu"', `staticUrl:"${noSlash}/static"`, 1, 'staticUrl');
bundle = replaceExact(bundle, 'siteUrl:"http://www2.youngvoters.eu"', `siteUrl:"${SITE_URL.replace(/\/$/, '')}"`, 1, 'siteUrl');
// baseURL builds the nav links: baseURL + "/#/about-this-tool"
bundle = replaceExact(bundle, 'baseURL:"/whosayswhat",apiURL:"/whosayswhat"}}', `baseURL:"${noSlash}",apiURL:"${noSlash}"}}`, 1, 'baseURL');
fs.writeFileSync(bundlePath, bundle);

// View templates use absolute /images/... paths.
const viewsDir = path.join(DIST, 'js/comparison-tool/views');
for (const f of ['index.html', 'mobile.html', 'about.html', 'learn-more.html', 'contact.html', 'comparison-page.html', 'includes/comparison-form.html', 'includes/comparison-results.html']) {
  const p = path.join(viewsDir, f);
  let t = fs.readFileSync(p, 'utf8');
  t = t.split('src="/images/').join(`src="${BASE}images/`);
  t = t.split('href="http://www.makeyourchoice.eu"').join(`href="${ARCHIVE}http://www.makeyourchoice.eu/"`);
  fs.writeFileSync(p, t);
}

// gumby.css @imports Open Sans from Google Fonts. It is self-hosted in lyv-webfonts.css.
const gumbyPath = path.join(DIST, 'lib/gumby/gumby.css');
fs.writeFileSync(gumbyPath, replaceExact(fs.readFileSync(gumbyPath, 'utf8'),
  '@import url(http://fonts.googleapis.com/css?family=Open+Sans:400,300,600,700);',
  '/* Open Sans is self-hosted: see css/lyv-webfonts.css */', 1, 'gumby font import'));

fs.copyFileSync(path.join(ROOT, 'src/shim/wsw-api.js'), path.join(DIST, 'js/wsw-api.js'));

// --- 3. data ------------------------------------------------------------------------
const { db, warnings } = loadData(path.join(ROOT, 'data'));
for (const w of warnings) console.warn('warning:', w);
const json = JSON.stringify(db);
const dataVersion = crypto.createHash('sha1').update(json).digest('hex').slice(0, 10);
fs.mkdirSync(path.join(DIST, 'data'), { recursive: true });
fs.writeFileSync(path.join(DIST, 'data/wsw.json'), json);

// Party logos: data/logos/<market_code>/<party_id>.jpg -> static/parties/<market_code>/<party_id>.jpg
const logos = path.join(ROOT, 'data/logos');
if (fs.existsSync(logos)) copyDir(logos, path.join(DIST, 'static/parties'));

// --- 4. page ------------------------------------------------------------------------
let page = fs.readFileSync(path.join(ROOT, 'src/page.html'), 'utf8');
page = page.split('{{BASE}}').join(BASE)
  .split('{{SITE_URL}}').join(SITE_URL)
  .split('{{ARCHIVE}}').join(ARCHIVE)
  .split('{{DATA_VERSION}}').join(dataVersion);
fs.writeFileSync(path.join(DIST, 'index.html'), page);
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
if (process.env.CNAME) fs.writeFileSync(path.join(DIST, 'CNAME'), process.env.CNAME + '\n');

console.log(`built dist/ (BASE=${BASE}): ${db.issues.length} issues, ${db.countries.length} countries, ` +
  `${db.parties.length} parties, ${db.statements.length} statements`);
