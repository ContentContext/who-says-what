"""Browser check: clicks through the tool and saves screenshots.

    python3 tests/e2e.py http://localhost:8765/who-says-what/ out-dir [label]

Fails (exit 1) on any page error, console error, failed request, or wrong result.
"""
import sys, os, json
from playwright.sync_api import sync_playwright

base, out = sys.argv[1], sys.argv[2]
label = sys.argv[3] if len(sys.argv) > 3 else 'site'
os.makedirs(out, exist_ok=True)
problems = []

def shot(page, name):
    page.wait_for_timeout(700)  # let the 0.25s fade-in animations finish
    page.screenshot(path=f'{out}/{label}-{name}.png', full_page=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.on('pageerror', lambda e: problems.append(f'pageerror: {e}'))
    page.on('console', lambda m: m.type == 'error' and problems.append(f'console: {m.text}'))
    page.on('requestfailed', lambda r: problems.append(f'requestfailed: {r.url}'))
    page.on('response', lambda r: r.status >= 400 and problems.append(f'HTTP {r.status}: {r.url}'))

    page.goto(base, wait_until='networkidle')
    page.wait_for_selector('#form-section-issues li')
    shot(page, '1-home')

    # counts in the form
    n_issues = page.locator('#form-section-issues li').count()
    n_countries = page.locator('#form-section-countries li').count()
    n_eu = page.locator('#form-section-parties-european li label').count()
    if (n_issues, n_countries) != (7, 28): problems.append(f'form shows {n_issues} issues, {n_countries} countries')

    # expand every section, as a visitor would
    for h in ['#form-section-issues h3', '#form-section-countries h3', '#form-section-parties-national h3', '#form-section-parties-european h3']:
        page.click(h)
    page.wait_for_timeout(400)
    if page.locator('#form-section-parties-national li.error').count() != 1:
        problems.append('national parties: "choose a country" message not shown before choosing a country')
    shot(page, '2-expanded')

    # pick Employment + Education, Italy + Germany, then parties
    page.click('#form-section-issues label:has-text("Employment")')
    page.click('#form-section-issues label:has-text("Education")')
    page.click('#form-section-countries label:has-text("Italy")')
    page.click('#form-section-countries label:has-text("Germany")')
    page.wait_for_selector('#form-section-parties-national li label')
    nat = page.locator('#form-section-parties-national li label').all_inner_texts()
    nat = [t.strip() for t in nat]
    if nat != ['Beispielpartei', 'Partito di Esempio', 'Sample Party Italy B']:
        problems.append(f'national parties for DE+IT: {nat}')
    page.click('#form-section-parties-national label:has-text("Partito di Esempio")')
    page.click('#form-section-parties-national label:has-text("Beispielpartei")')
    page.click('#form-section-parties-european label:has-text("Sample European Party A")')
    shot(page, '3-selected')

    page.click('#get-result-btn', force=True)
    page.wait_for_selector('#form-section-body-results .single-party')
    shot(page, '4-results')
    url = page.url
    if '#/results/employment|education/9101,9201,9001' not in url.replace('%7C', '|'):
        problems.append(f'results URL: {url}')

    results = page.evaluate('''() => [...document.querySelectorAll('.single-country-results')].map(c => ({
        issue: c.querySelector('.single-issue-title').innerText.trim(),
        country: (c.querySelector('.single-country-title')||{innerText:'(EU)'}).innerText.trim(),
        parties: [...c.querySelectorAll('.single-party')].map(p => ({
            logo: p.querySelector('.party-logo img').naturalWidth > 0,
            title: p.querySelector('.party-logo img').title,
            text: [...p.querySelectorAll('.entry-text')].filter(e => e.offsetParent).map(e => e.innerText.trim().slice(0, 40)),
            original: [...p.querySelectorAll('.entry-original-text')].filter(e => e.offsetParent).map(e => e.innerText.trim().slice(0, 40)),
        }))}))''')
    expect = [('Education', '(EU)', 'Sample European Party A'),
              ('Employment', 'Germany', 'Beispielpartei'),
              ('Employment', 'Italy', 'Partito di Esempio'),
              ('Employment', '(EU)', 'Sample European Party A')]
    got = sorted((r['issue'], r['country'], p['title']) for r in results for p in r['parties'])
    if got != sorted(expect): problems.append(f'results: {got}')
    if not all(p['logo'] for r in results for p in r['parties']): problems.append('a party logo did not load')
    it = [p for r in results for p in r['parties'] if p['title'] == 'Partito di Esempio']
    if not it or not it[0]['original']: problems.append('original-language text not shown for Partito di Esempio')

    # sidebar summary: remove a party and the results update
    page.click('#summary li.green:has-text("Beispielpartei") a.summary-remove-link')
    page.wait_for_timeout(800)
    if page.locator('.single-country-title:has-text("Germany")').count() != 0:
        problems.append('removing a party from the summary did not update the results')

    # deep link: reloading a results URL restores the selection and results
    page.goto(url, wait_until='networkidle'); page.reload(wait_until='networkidle')
    page.wait_for_selector('#form-section-body-results .single-party')
    n = page.locator('#form-section-body-results .single-party').count()
    if n != 4: problems.append(f'deep link shows {n} party results, expected 4')
    if page.locator('#summary li.item-menu').count() != 7:  # 2 issues + 2 countries + 2 national + 1 european
        problems.append(f'deep link summary has {page.locator("#summary li.item-menu").count()} items')
    shot(page, '5-deeplink')

    # "Start a new search!" returns to the form
    page.click('#new-search-btn'); page.wait_for_selector('#ct-main-form')
    for route, name in [('#/about-this-tool', '6-about'), ('#/learn-more', '7-learn-more')]:
        page.goto(base + route, wait_until='networkidle'); shot(page, name)
        if 'current_page' not in (page.locator('#ct-topNav a.current_page').get_attribute('class') or ''):
            problems.append(f'{route}: nav item not highlighted')

    # phones get the original "use a computer" overlay
    m = browser.new_page(viewport={'width': 375, 'height': 812}, user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    m.goto(base, wait_until='networkidle'); m.wait_for_selector('#mobile-version-overlay img')
    m.wait_for_timeout(500); m.screenshot(path=f'{out}/{label}-8-phone.png', full_page=True)

    fonts = page.evaluate('''async () => { await document.fonts.ready;
        return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family) }''')
    browser.close()

print(json.dumps({'issues': n_issues, 'countries': n_countries, 'european_parties': n_eu, 'fonts_loaded': sorted(set(fonts))}))
if problems:
    print('PROBLEMS:'); [print(' -', x) for x in problems]; sys.exit(1)
print('OK')
