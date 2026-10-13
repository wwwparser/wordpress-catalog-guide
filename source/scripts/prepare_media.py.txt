"""Prepare the source site's small demo video and locally hosted Onest fonts."""
import json
import re
import subprocess
import sys
from pathlib import Path
import requests
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.services.reference_client import ReferenceClient
media = ROOT / 'wordpress/wp-content/themes/cerlab-child/assets/media'
media.mkdir(parents=True, exist_ok=True)
css = requests.get('https://fonts.googleapis.com/css2?family=Onest:wght@400;700', timeout=30)
css.raise_for_status()
font_urls = re.findall(r'url\((https://fonts.gstatic.com/[^)]+)\)', css.text)
if len(font_urls) != 2:
    raise RuntimeError('Unexpected Google Fonts response; inspect it before selecting font files')
for name, url in zip(['onest-regular.ttf', 'onest-bold.ttf'], font_urls):
    target = media / name
    if not target.exists():
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        target.write_bytes(response.content)
    if target.read_bytes()[:4] != b'\x00\x01\x00\x00':
        raise RuntimeError('Expected a TrueType font')
client = ReferenceClient(ROOT / 'research/pages')
client.get('https://cer-lab.ru/wp-content/uploads/2026/06/202606040910.mp4', media / 'induction.mp4', max_bytes=40_000_000)
poster = media / 'induction-poster.jpg'
if not poster.exists():
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', '2', '-i', str(media / 'induction.mp4'), '-frames:v', '1', str(poster)], check=True)
print('Video, poster and fonts ready')
