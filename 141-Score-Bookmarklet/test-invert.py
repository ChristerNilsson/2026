"""Browser verification: python test-invert.py (requires Playwright and Chrome)."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / '.test-tools'))
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
SOURCE = (HERE / 'invert.js').read_text(encoding='utf-8')
BOOKMARKLET = (HERE / 'invert-bookmarklet.txt').read_text(encoding='utf-8').strip()
STYLE_ID = '__invert_bookmarklet_style__'

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.goto('https://www.marshallchessclub.org/about', wait_until='networkidle')
    page.screenshot(path=str(HERE / 'invert-before.png'), full_page=True)
    before = page.evaluate('getComputedStyle(document.documentElement).filter')
    page.evaluate(BOOKMARKLET.removeprefix('javascript:'))
    assert page.evaluate('getComputedStyle(document.documentElement).filter') == 'invert(1) hue-rotate(180deg)'
    assert page.locator('img').count() > 0
    assert page.locator('img').first.evaluate('(e) => getComputedStyle(e).filter') == 'invert(1) hue-rotate(180deg)'
    page.screenshot(path=str(HERE / 'invert-after.png'), full_page=True)
    page.evaluate(SOURCE)
    assert page.locator(f'#{STYLE_ID}').count() == 0
    assert page.evaluate('getComputedStyle(document.documentElement).filter') == before
    page.screenshot(path=str(HERE / 'invert-restored.png'), full_page=True)
    for color in ['white', '#111']:
        page.set_content(f'<html style="background:{color}"><body><p>Theme test</p></body></html>')
        original = page.locator('html').get_attribute('style')
        page.evaluate(SOURCE)
        assert page.evaluate('getComputedStyle(document.documentElement).filter') == 'invert(1) hue-rotate(180deg)'
        page.evaluate(SOURCE)
        assert page.locator('html').get_attribute('style') == original
    page.set_content('<p>Transparent canvas</p>')
    page.evaluate(SOURCE)
    assert page.evaluate('getComputedStyle(document.documentElement).backgroundColor') == 'rgb(255, 255, 255)'
    page.evaluate(SOURCE)
    assert page.evaluate('getComputedStyle(document.documentElement).backgroundColor') == 'rgba(0, 0, 0, 0)'
    print(json.dumps({'marshall': 'passed', 'toggle_restore': 'passed', 'light_and_dark': 'passed', 'transparent_canvas': 'passed'}))
    browser.close()
