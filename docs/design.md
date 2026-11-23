# Design: taste and direction

For this project the taste was settled in 2014: the brief is to rebuild the
original visual language exactly. So the direction brief records what the original
*is*, what had to change, and why.

## The original (2014)

- **Direction:** editorial and playful but not childish; loud colour on a quiet page.
  Collage illustration (a pufferfish on a string, a hot-air balloon, a DeLorean) does
  the expressive work. The UI itself stays plain.
- **Type:** FF Meta Web Pro. *Black Italic* for every heading, label and button;
  *Book* for running text. Open Sans for Gumby framework defaults.
- **Colour:** one colour per form section, carried through to the results and the
  search summary:

  | role | colour | contrast on white |
  |---|---|---|
  | Key issues | `#e96748` orange | 3.2:1, used for large headings only |
  | Countries | `#924399` violet | 6.0:1 |
  | National parties | `#195d2f` green | 7.9:1 |
  | European parties | `#0081c3` blue | 4.3:1 |
  | Footer | `#90d8f7` sky blue | (background) |

- **Layout:** Gumby 12-column grid. Three-column sidebar for the search summary,
  seven columns of content on the home page and nine on results. Results are three
  party columns per row.
- **Motion:** 0.25 s fade-in on views; the "Get results" balloon swings
  continuously.

## What changed and why

| change | reason |
|---|---|
| **FF Meta → Fira Sans** (same `font-family` names, so all CSS is unchanged) | FF Meta is a commercial typeface licensed to youngvoters.eu and can't be redistributed in a public repo. Fira Sans (SIL OFL) is Erik Spiekermann's own Meta-derived design. `size-adjust` (Black Italic 99.4%, Book 95.0%, Book Italic 95.4%) is computed from measured advance widths against the original files, and ascent/descent overrides copy Meta's 0.763/0.237 line metrics, so line breaks and vertical rhythm stay as they were. Greek and Cyrillic subsets are added for original-language excerpts from Greece, Cyprus and Bulgaria. |
| **Open Sans self-hosted** | Was loaded from Google Fonts: a third-party request and a privacy cost. |
| **Google Analytics and Facebook SDK removed** | Dead property; no consent banner. The rebuilt site sets no cookies. |
| **Login/register box removed** | It posted to youngvoters.eu, which no longer exists. It was hidden on this page. |
| **Unused scripts dropped** | jQuery UI, Backbone, Underscore, jQuery tmpl/validate, AnythingSlider, ngResource and ngAnimate were loaded but not used by the tool. Their CSS is kept so the cascade is unchanged. |
| **Two encoding errors on the about page fixed** (a stray control character after the opening quote, and `â€™` for an apostrophe) | Both showed as garbage characters on the 2014 site too. |
| **Dead links → Wayback Machine** | youngvoters.eu and makeyourchoice.eu are gone. Footer links open archived copies and say so in their title. |
| **API → local data** | See `docs/data-format.md` and `src/shim/wsw-api.js`. |

## Known gaps against today's principles (kept for fidelity)

These are faithful to 2014 and worth revisiting if the tool is to be used again:

- **Phones** get the original "use a computer" overlay (`mobile.html`) instead of the tool.
- **Contrast:** white footer text on `#90d8f7` is 1.6:1, and the grey search-summary
  text (`#999`) is 2.9:1. Both fail WCAG AA.
- **Keyboard:** the expandable form sections are `<h3>`s with click handlers. They
  can't be reached by keyboard, and the custom checkboxes hide the native ones.
- **Motion:** the balloon swings forever and ignores `prefers-reduced-motion`.
- **Body text** is 14 px.
