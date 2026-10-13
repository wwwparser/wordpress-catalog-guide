"""Configure a new local WordPress runtime without changing other projects."""
import json
import secrets
import shutil
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
runtime = ROOT / 'runtime'
wp = runtime / 'wordpress'
if not (wp / 'wp-load.php').exists():
    raise SystemExit('Run python scripts/download_runtime.py first')
for source in [ROOT / 'wordpress/wp-content/themes/cerlab-child', ROOT / 'wordpress/wp-content/plugins/cerlab-catalog']:
    target = wp / source.relative_to(ROOT / 'wordpress')
    shutil.copytree(source, target, dirs_exist_ok=True)
shutil.copyfile(wp / 'wp-content/plugins/sqlite-database-integration/db.copy', wp / 'wp-content/db.php')
credentials_file = runtime / 'credentials.json'
if not credentials_file.exists():
    credentials_file.write_text(json.dumps({'username': 'yuri', 'email': 'local@example.invalid', 'password': secrets.token_urlsafe(24)}, indent=2), encoding='utf-8')
config = wp / 'wp-config.php'
if not config.exists():
    values = "<?php\n"
    values += "define('DB_NAME', 'cerlab'); define('DB_USER', ''); define('DB_PASSWORD', ''); define('DB_HOST', 'localhost');\n"
    values += "define('DB_CHARSET','utf8'); define('DB_COLLATE',''); define('DB_ENGINE','sqlite');\n"
    values += "define('DB_PATH', dirname(__DIR__) . '/cerlab.sqlite');\n"
    values += "define('WP_HOME','http://127.0.0.1:8136'); define('WP_SITEURL','http://127.0.0.1:8136');\n"
    values += "define('DISABLE_WP_CRON',true); define('WP_HTTP_BLOCK_EXTERNAL',true); define('WP_ACCESSIBLE_HOSTS','127.0.0.1,localhost');\n"
    values += "define('WP_DEBUG',true); define('WP_DEBUG_LOG',true); define('WP_DEBUG_DISPLAY',false); define('DISALLOW_FILE_EDIT',true);\n"
    for key in ['AUTH_KEY', 'SECURE_AUTH_KEY', 'LOGGED_IN_KEY', 'NONCE_KEY', 'AUTH_SALT', 'SECURE_AUTH_SALT', 'LOGGED_IN_SALT', 'NONCE_SALT']:
        values += f"define('{key}','{secrets.token_hex(32)}');\n"
    values += "$table_prefix='wp_'; if (!defined('ABSPATH')) define('ABSPATH', __DIR__ . '/'); require_once ABSPATH . 'wp-settings.php';\n"
    config.write_text(values, encoding='utf-8')
subprocess.run(['php', str(ROOT / 'scripts/install-local.php')], check=True, cwd=ROOT)
print('Local URL: http://127.0.0.1:8136; credentials: runtime/credentials.json')
