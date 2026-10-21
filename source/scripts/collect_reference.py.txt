"""Collect a small catalogue sample and visual assets, without copying executable JS."""
import hashlib
import json
import sys
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.services.reference_client import ReferenceClient
client = ReferenceClient(ROOT / 'research/pages')
assets = ROOT / 'wordpress/wp-content/themes/cerlab-child/assets/media'
assets.mkdir(parents=True, exist_ok=True)
manifest = []

def asset(url):
    url = urljoin('https://cer-lab.ru/', url)
    name = unquote(Path(urlsplit(url).path).name)
    data = client.get(url, assets / name)
    manifest.append({'file': name, 'source': url, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
    return name

home = BeautifulSoup(client.get('https://cer-lab.ru/', ROOT / 'research/reference.html'), 'html.parser')
categories = []
seen = set()
for a in home.select('a[href]'):
    href = urljoin('https://cer-lab.ru/', a['href'].strip())
    if href.endswith('/category/mebel-dlja-vannyh/'):
        href = 'https://cer-lab.ru/category/mebel-dlja-kuhni/'
    img = a.find('img')
    if '/category/' not in href or not img or href in seen:
        continue
    seen.add(href)
    slug = urlsplit(href).path.rstrip('/').split('/')[-1]
    soup = BeautifulSoup(client.get(href, ROOT / f'research/pages/category-{slug}.html'), 'html.parser')
    product_links = list(dict.fromkeys(urljoin(href, x['href']) for x in soup.select('a[href]') if '/product/' in x['href']))
    categories.append({'slug': slug, 'name': a.get_text(' ', strip=True), 'image': asset(img['src']), 'source': href, 'products': product_links})
    print('category', slug, flush=True)

products = []
for index, a in enumerate(home.select('a.product-item')):
    href = a['href']
    slug = urlsplit(href).path.rstrip('/').split('/')[-1]
    soup = BeautifulSoup(client.get(href, ROOT / f'research/pages/product-{slug}.html'), 'html.parser')
    name = a.select_one('.product-item__name').get_text(strip=True)
    gallery = [asset(x['src']) for x in soup.select('img[src]') if x.get('alt') == name]
    # Keep only the product's information area, not footer or contact information.
    heading = soup.find('h1')
    info = soup.select_one('.product-info') or (heading.parent if heading else None)
    while info and len(info.get_text(' ', strip=True)) < 80:
        info = info.parent
    text = info.get_text(' ', strip=True) if info else ''
    products.append({'slug': slug, 'name': name, 'image': asset(a.find('img')['src']),
                     'gallery': gallery, 'description': text, 'source': href,
                     'categories': [x['slug'] for x in categories if href in x['products']],
                     'group': 'new' if index < 4 else 'popular'})
    print('product', slug, flush=True)

for name in ['house.webp', 'logo1.svg', 'contact-form-image.webp', 'Dek.svg', 'laminam-.svg',
             'container-lea-ceramiche-porcelain-tiles-for-floors-and-walls.svg',
             'icon-cotto-deste-porcelain-tiles-and-kerlite-for-floors-and-walls.svg']:
    asset('https://cer-lab.ru/wp-content/uploads/2026/06/' + name)

result = {'reference': 'https://cer-lab.ru/', 'categories': categories, 'products': products}
(ROOT / 'research/catalogue.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
(ROOT / 'research/assets-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('Reference data saved')
