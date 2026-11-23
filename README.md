# Youth issues: Who says what?

A static rebuild of the comparison tool that the [League of Young Voters in Europe](https://web.archive.org/web/2014/http://www.youngvoters.eu/)
and [Kieskompas](http://home.kieskompas.nl/en/) launched for the 2014 European
Parliament elections. You pick key issues, countries and parties, and it shows what
each party's manifesto said about each issue.

The original ran at `youngvoters.eu/whosayswhat` on an AngularJS front end and a
JSONP API (`api2.youngvoters.eu`). Both domains are gone. This repo rebuilds the tool
for GitHub Pages and keeps the original look and behaviour.

## Status: shell rebuilt, content still to come

The Wayback Machine archived the pages, scripts, styles and images, but **none of the
API data** (key issues, countries, parties and the manifesto statements). Its index
has no captures of any API call. So:

* **Rebuilt from the archive:** the page, all eight view templates, the original
  `comparison-tool.min.js` bundle, every stylesheet and every image.
* **Reconstructed:** the 7 key issues and 28 countries (names from the archived
  about page, codes from youngvoters.eu's own URLs).
* **Sample only:** parties and statements. `data/` holds a few clearly labelled
  sample rows so every screen works. Each one says `[Sample]`.

To fill it in, see [docs/data-format.md](docs/data-format.md). It means editing four
CSV files in a spreadsheet.

## How it works

```
data/*.csv ──build──▶ dist/data/wsw.json
                                │
original bundle ──$http JSONP──▶ src/shim/wsw-api.js  (answers the 5 old API calls locally)
```

The original Angular bundle is unchanged except for URLs. The build makes exact,
counted string replacements, so templates and the API address work under any base
path, and it fails if any replacement stops matching. `src/shim/wsw-api.js` decorates
Angular's `$http`: requests to `wsw://api/<method>` are answered from `wsw.json` in
the same shape the old API used:

| old endpoint | answered with |
|---|---|
| `category.getList` | `issues.csv` |
| `world.getMarkets` | `countries.csv` |
| `party.getList` (all, `market_code=eu`, or `market_codes[]=…`) | `parties.csv` |
| `comparison.build` (`key_issues[]`, `party_ids[]`) | `statements.csv` |

Result URLs (`#/results/employment|education/9101,9001`) still work, so a result can
be bookmarked and shared, as in the original.

## Repository layout

```
src/page.html       the page (original markup, cleaned: see docs/design.md)
src/static/         original CSS, JS, view templates and images; Gumby, jQuery, Angular 1.2.16; fonts
src/shim/           wsw-api.js, the in-browser API
src/original/       the archived page and font stylesheet, for reference
data/               issues, countries, parties, statements (CSV) and party logos
scripts/            build.mjs, data.mjs (CSV parsing and checks)
tests/              data and API tests (node), browser click-through (Playwright)
docs/               data format, design decisions
```

## Run locally

```
npm test            # check the data and the API engine
npm run serve       # build into dist/ and serve at http://localhost:8000
```

Needs Node 20+ and Python 3. There are no npm dependencies. The browser test
(`python3 tests/e2e.py <url> <screenshot-dir>`) needs Playwright and Chrome, and
checks the form, results, summary, deep links, the about pages and the phone view
against the sample data.

## Deploy

Each push to `main` runs the tests, builds and publishes to GitHub Pages
(`.github/workflows/pages.yml`). In **Settings → Pages**, set *Source* to
**GitHub Actions**. The site is then at `https://contentcontext.github.io/who-says-what/`.

For a custom domain, set repository variables `BASE=/`, `SITE_URL=https://<domain>/`
and `CNAME=<domain>`.

## Changes from the original

Fonts (FF Meta → metric-matched Fira Sans), self-hosted Open Sans, analytics and the
Facebook SDK removed, the dead login box removed, unused scripts dropped, dead links
pointed at the Wayback Machine. Details and reasons are in
[docs/design.md](docs/design.md), which also lists accessibility gaps kept for
fidelity.

## Credits

Original tool © 2014 League of Young Voters in Europe (an initiative of the European
Youth Forum), with Kieskompas. Fira Sans and Open Sans: SIL Open Font License 1.1
(`src/static/fonts/`). AngularJS, jQuery, Gumby: MIT.
