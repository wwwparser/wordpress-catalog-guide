"""Package independently installable WordPress themes and plugins."""
import argparse
import zipfile
from pathlib import Path

def package(source: Path, destination: Path):
    source = source.resolve()
    destination = destination.resolve()
    if not source.is_dir():
        raise ValueError(f'Source directory missing: {source}')
    if destination.is_relative_to(source):
        raise ValueError('Archive must be outside source directory')
    if not ((source / 'style.css').exists() or any('Plugin Name:' in p.read_text(encoding='utf-8')[:1500] for p in source.glob('*.php'))):
        raise ValueError('Expected a theme or plugin directory')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source.rglob('*')):
            if not path.is_file() or any(part.startswith('.') or part in ('node_modules', '__pycache__') for part in path.relative_to(source).parts):
                continue
            if path.suffix in ('.log', '.sqlite', '.db') or path.name in ('wp-config.php', 'credentials.json'):
                continue
            archive.write(path, Path(source.name) / path.relative_to(source))
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
    print(destination)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    package(args.source, args.destination)
