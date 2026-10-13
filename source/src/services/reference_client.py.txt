"""Bounded, cached read-only access to the public reference site."""
import time
from pathlib import Path
from urllib.parse import urlsplit
import requests


class ReferenceClient:
    def __init__(self, cache: Path):
        self.cache = cache
        cache.mkdir(parents=True, exist_ok=True)
        self.session = requests.Session()

    def get(self, url: str, destination: Path, max_bytes=25_000_000) -> bytes:
        if urlsplit(url).hostname != 'cer-lab.ru':
            raise ValueError('Reference downloader accepts cer-lab.ru only')
        if destination.exists():
            return destination.read_bytes()
        for attempt in range(3):
            try:
                with self.session.get(url, timeout=(10, 40), stream=True) as r:
                    r.raise_for_status()
                    data = bytearray()
                    for chunk in r.iter_content(65536):
                        data.extend(chunk)
                        if len(data) > max_bytes:
                            raise ValueError('Reference asset exceeds size limit')
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
                return bytes(data)
            except requests.RequestException:
                if attempt == 2:
                    raise RuntimeError(f'Reference unavailable: {urlsplit(url).path}') from None
                time.sleep(2 + attempt)

