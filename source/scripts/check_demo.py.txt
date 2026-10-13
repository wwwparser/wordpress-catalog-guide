"""Meaningful local integration checks: routes, form storage, editor and responsive UI."""
import json
import subprocess
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8136'
report = {}
def state(mode=''):
    args = ['php', str(ROOT / 'scripts/check-wordpress.php')]
    if mode: args.append(mode)
    return json.loads(subprocess.check_output(args, cwd=ROOT, encoding='utf-8'))

initial = state('cleanup')
assert initial['block_theme'] and initial['parent'] == 'twentytwentyfive'
assert initial['greenshift'] and int(initial['products']) == 8 and int(initial['categories']) == 5
report['wordpress'] = initial
data = json.loads((ROOT / 'research/catalogue.json').read_text(encoding='utf-8'))
routes = ['/'] + ['/category/' + x['slug'] + '/' for x in data['categories']] + ['/product/' + x['slug'] + '/' for x in data['products']] + ['/about/', '/contacts/', '/privacy/']
s = requests.Session()
s.trust_env = False
for route in routes:
    r = s.get(BASE + route, timeout=20)
    assert r.status_code == 200, (route, r.status_code)
    assert 'Fatal error' not in r.text
assert s.get(BASE + '/not-a-page/', timeout=20).status_code == 404
for path in ['/wp-config.php', '/wp-content/debug.log', '/cerlab.sqlite']:
    assert s.get(BASE + path, timeout=20).status_code == 403
report['routes'] = {'passed': len(routes), 'missing_page': 404, 'private_files_blocked': True}
html = BeautifulSoup(s.get(BASE, timeout=20).text, 'html.parser')
nonce = html.select_one('input[name=cerlab_nonce]')['value']
payload = {'action': 'cerlab_enquiry', 'cerlab_nonce': 'bad', 'name': 'QA local demo', 'phone': '+70000000000', 'consent': '1'}
assert s.post(BASE + '/wp-admin/admin-post.php', data=payload, timeout=20).status_code == 403
payload['cerlab_nonce'] = nonce
payload.pop('consent')
assert s.post(BASE + '/wp-admin/admin-post.php', data=payload, timeout=20).status_code == 400
payload['consent'] = '1'
try:
    r = s.post(BASE + '/wp-admin/admin-post.php', data=payload, allow_redirects=False, timeout=20)
    assert r.status_code == 302
    assert state()['test_leads'] == 1
    report['form'] = {'saved_to_database': True, 'invalid_nonce_rejected': True, 'consent_required': True}
finally:
    state('cleanup')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    for width in [1440, 990, 768, 390]:
        page.set_viewport_size({'width': width, 'height': 900 if width > 640 else 844})
        page.goto(BASE, wait_until='networkidle')
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), width
        assert page.locator('.category-card').count() == 5
        assert page.locator('.product-card').count() == 8
        if width == 390:
            page.get_by_role('button', name='Меню').click()
            assert page.locator('#main-nav').is_visible()
            page.keyboard.press('Escape')
            assert not page.locator('#main-nav').is_visible()
        for image in page.locator('img').all():
            image.scroll_into_view_if_needed()
        page.wait_for_function("[...document.images].every(i=>i.complete && i.naturalWidth > 0)")
        page.evaluate('scrollTo(0,0)')
        if width in [1440, 390]:
            page.screenshot(path=str(ROOT / f'research/prototype-{width}.png'), full_page=True)
    report['responsive'] = {'widths': [1440, 990, 768, 390], 'overflow': False, 'images_loaded': True, 'mobile_menu': True}
    page.goto(BASE + '/product/rapolano/', wait_until='networkidle')
    assert page.locator('.product-info').get_by_role('heading', name='Rapolano').count() == 1
    assert '3000 x 1200' in page.locator('.product-info').inner_text()
    page.screenshot(path=str(ROOT / 'research/prototype-product.png'), full_page=True)
    report['product'] = {'specifications': True, 'gallery': True}
    credentials = json.loads((ROOT / 'runtime/credentials.json').read_text(encoding='utf-8'))
    page.goto(BASE + '/wp-login.php')
    page.locator('#user_login').fill(credentials['username'])
    page.locator('#user_pass').fill(credentials['password'])
    page.locator('#wp-submit').click()
    page.wait_for_url('**/wp-admin/**')
    page.goto(BASE + f"/wp-admin/post.php?post={initial['home_id']}&action=edit", wait_until='domcontentloaded')
    page.wait_for_function("window.wp?.data?.select('core/block-editor')?.getBlocks().length > 0", timeout=45000)
    validation = page.evaluate("""() => { const out=[]; function walk(bs){bs.forEach(b=>{out.push({name:b.name,valid:b.isValid});walk(b.innerBlocks||[])})};walk(wp.data.select('core/block-editor').getBlocks());return out;}""")
    assert all(x['valid'] for x in validation), validation
    assert any(x['name'] == 'greenshift-blocks/element' for x in validation)
    report['editor'] = {'valid_blocks': validation, 'greenshift_blocks_present': True}
    page.screenshot(path=str(ROOT / 'research/prototype-editor.png'))
    paragraph = page.evaluate("""() => {
        let found; function walk(bs){for(const b of bs){if(b.name==='greenshift-blocks/element' && b.attributes.tag==='p') found=b;walk(b.innerBlocks||[])}};
        walk(wp.data.select('core/block-editor').getBlocks());
        return {id:found.clientId, text:found.attributes.textContent};
    }""")
    try:
        page.evaluate("async ({id,text}) => {wp.data.dispatch('core/block-editor').updateBlockAttributes(id,{textContent:text+' QA-editor-check'});await wp.data.dispatch('core/editor').savePost();}", paragraph)
        assert 'QA-editor-check' in s.get(BASE, timeout=20).text
        report['editor']['greenshift_edit_saved_and_rendered'] = True
    finally:
        page.evaluate("async ({id,text}) => {wp.data.dispatch('core/block-editor').updateBlockAttributes(id,{textContent:text});await wp.data.dispatch('core/editor').savePost();}", paragraph)
    product = page.evaluate("async () => (await wp.apiFetch({path:'/wp/v2/cerlab_product?slug=rapolano&context=edit'}))[0]")
    original_size = product['meta']['_cerlab_size']
    try:
        page.evaluate("async ({id}) => await wp.apiFetch({path:'/wp/v2/cerlab_product/'+id, method:'POST', data:{meta:{_cerlab_size:'3100 x 1300 (QA)'}}})", {'id': product['id']})
        assert '3100 x 1300 (QA)' in s.get(BASE + '/product/rapolano/', timeout=20).text
        report['editor']['product_edit_persists_and_renders'] = True
    finally:
        page.evaluate("async ({id,size}) => await wp.apiFetch({path:'/wp/v2/cerlab_product/'+id, method:'POST', data:{meta:{_cerlab_size:size}}})", {'id': product['id'], 'size': original_size})
    report['browser_errors'] = errors
    assert not errors, errors
    browser.close()
(ROOT / 'research/verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print('All route, form, responsive, product and editor checks passed.')
