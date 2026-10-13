"""Download official archives only; does not execute any downloaded PHP."""
import hashlib
import io
import json
import zipfile
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
runtime = ROOT / 'runtime'
runtime.mkdir(exist_ok=True)
sources = [
    ('wordpress', 'https://downloads.wordpress.org/release/wordpress-7.1.3.zip', runtime),
    ('sqlite', 'https://downloads.wordpress.org/plugin/sqlite-database-integration.3.1.0.zip', runtime / 'wordpress/wp-content/plugins'),
    ('parent-theme', 'https://downloads.wordpress.org/theme/twentytwentyfive.1.5.zip', runtime / 'wordpress/wp-content/themes'),
    ('greenshift', 'https://downloads.wordpress.org/plugin/greenshift-animation-and-page-builder-blocks.13.2.1.zip', runtime / 'wordpress/wp-content/plugins'),
]
manifest = []
for name, url, target in sources:
    r = requests.get(url, timeout=90)
    r.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        for member in z.infolist():
            resolved = (target / member.filename).resolve()
            if not resolved.is_relative_to(target.resolve()):
                raise RuntimeError('Unsafe archive member')
        z.extractall(target)
    manifest.append({'name': name, 'url': url, 'sha256': hashlib.sha256(r.content).hexdigest(), 'bytes': len(r.content)})
    print(name, len(r.content), flush=True)
(ROOT / 'research/runtime-sources.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
