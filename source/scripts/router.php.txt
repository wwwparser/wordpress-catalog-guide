<?php
// Development server router. Database and credentials live outside document root.
$root = realpath(dirname(__DIR__) . '/runtime/wordpress');
$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (preg_match('~(?:^|/)(?:\.|wp-config\.php|debug\.log|db\.php)(?:/|$)|\.sqlite(?:$|\.)~i', $uri)) {
    http_response_code(403); exit('Forbidden');
}
$path = realpath($root . $uri);
if ($path && str_starts_with(strtolower($path), strtolower($root . DIRECTORY_SEPARATOR)) && (is_file($path) || (is_dir($path) && is_file($path . '/index.php')))) return false;
require $root . '/index.php';
