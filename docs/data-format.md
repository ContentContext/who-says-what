# Data format

The tool's content lives in four CSV files in `data/`. Edit them in any spreadsheet
program (LibreOffice, Numbers, Excel, Google Sheets) and save as **CSV, UTF-8**.
On every build, `scripts/data.mjs` checks the files and turns them into
`dist/data/wsw.json`, which the site reads in place of the old
`api2.youngvoters.eu` API. If anything is wrong, the build stops and lists the
problem row by row.

Run `npm test && npm run build` locally to check your edits before pushing.

## `issues.csv`: the key issues

| column | required | notes |
|---|---|---|
| `category_id` | yes | Any unique id. `statements.csv` refers to it. |
| `category_slug` | yes | Lower case, `a-z 0-9 -`. Used in shareable result URLs (`#/results/education|employment/…`), so don't change it once links are out. |
| `category_name` | yes | Shown in the form and as the heading of each result block. The form adds "(only available for European Political Parties)" after an issue named exactly `Education`, as the original did. |

Rows appear in the form in file order. The seven rows shipped are the topics named
on the original site.

## `countries.csv`: the countries

| column | required | notes |
|---|---|---|
| `market_id` | yes | Any unique id. |
| `market_code` | yes | The League's own two-letter code. These are **not all ISO codes**: the UK is `uk` and Slovenia is `sl`, as on youngvoters.eu. `eu` is reserved for European parties. |
| `country_name` | yes | Shown in the form and in the results. The form adds "(coming soon)" after `Malta`, as the original did. Malta had no data in 2014. |

Rows are split over three columns in the form in file order (alphabetical, as shipped).

## `parties.csv`: national and European parties

| column | required | notes |
|---|---|---|
| `party_id` | yes | Unique, letters/digits/`-`/`_` only. Appears in result URLs. |
| `party_market_code` | yes | A `market_code` from `countries.csv`, or `eu` for a European political party. |
| `party_name` | yes | Must be unique within a country, because the results page groups by name. |
| `party_abbreviation` | no | Used for the placeholder logos. |
| `notes` | no | For editors; not published. Rows whose notes start with `SAMPLE` are counted as sample data, and the build warns while any are left. |

National parties are listed by country (in `countries.csv` order), then in file order.

**Logos:** put the logo at `data/logos/<party_market_code>/<party_id>.jpg`. It is
shown 100 px high. A party without a logo gets a neutral grey placeholder.

## `statements.csv`: what each party says

One row per party per issue. Leave the issue out for a party that said nothing on it.
The about page explains that blanks mean no statement was found.

| column | required | notes |
|---|---|---|
| `party_id` | yes | From `parties.csv`. |
| `category_id` | yes | From `issues.csv`. |
| `comparison_text` | one of these two | The excerpt in English. |
| `comparison_text_original` | one of these two | The excerpt in the manifesto's own language, shown under the English text. Leave it empty for English manifestos. |
| `source_title` | recommended | For example "PES Manifesto 2014". The build warns when a row has no source. |
| `source_url` | recommended | Link to the manifesto (or its archived copy). |
| `notes` | no | For editors; not published. |

Both text fields may contain simple HTML (`<em>`, `<strong>`, `<br>`, `<a href>`).
Anything else is stripped by Angular's sanitiser. Several rows for the same party and
issue are shown one after another.

`source_title` and `source_url` are passed through to the page data but the original
results template doesn't display them. Showing them would be a small template
change (see the README).

## Replacing the sample data

The rows marked `SAMPLE` in `parties.csv` and `statements.csv`, and their logos
in `data/logos/`, are there to show the format and exercise the tool. Delete them
once real content goes in.
