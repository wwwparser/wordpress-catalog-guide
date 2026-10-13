<?php
// Run from the CLI only. This script seeds a dedicated local demo.
if (PHP_SAPI !== 'cli') exit(1);
$root = dirname(__DIR__);
$_SERVER['HTTP_HOST'] = '127.0.0.1:8136';
$_SERVER['SERVER_NAME'] = '127.0.0.1';
$_SERVER['REQUEST_URI'] = '/';
$_SERVER['SERVER_PROTOCOL'] = 'HTTP/1.1';
define('WP_INSTALLING', true);
require $root . '/runtime/wordpress/wp-load.php';
require_once ABSPATH . 'wp-admin/includes/upgrade.php';
require_once ABSPATH . 'wp-admin/includes/plugin.php';
$credentials = json_decode(file_get_contents($root . '/runtime/credentials.json'), true);
if (!is_blog_installed()) {
    wp_install('Cerlab — учебная копия', $credentials['username'], $credentials['email'], false, '', $credentials['password']);
}
wp_set_current_user(1);
foreach (['cerlab-catalog/cerlab-catalog.php', 'greenshift-animation-and-page-builder-blocks/plugin.php'] as $plugin) {
    $result = activate_plugin($plugin);
    if (is_wp_error($result)) throw new RuntimeException($result->get_error_message());
}
require_once WP_PLUGIN_DIR . '/cerlab-catalog/cerlab-catalog.php';
// Register the types now: plugins were activated after the init action.
cerlab_register_types();
switch_theme('cerlab-child');
update_option('permalink_structure', '/%postname%/');
update_option('blog_public', 0);
function demo_import_media() {
    if (get_option('cerlab_demo_media_imported')) return;
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $uploads = wp_upload_dir();
    foreach (get_posts(['post_type' => 'cerlab_product', 'numberposts' => -1]) as $product) {
        $gallery = get_post_meta($product->ID, '_cerlab_gallery', true);
        $files = array_unique(array_merge([get_post_meta($product->ID, '_cerlab_image', true)], is_array($gallery) ? $gallery : []));
        $ids = [];
        foreach ($files as $file) {
            if (!$file) continue;
            $source = get_stylesheet_directory() . '/assets/media/' . basename($file);
            $target = $uploads['path'] . '/' . basename($file);
            if (!is_file($source)) throw new RuntimeException('Missing sample image');
            copy($source, $target);
            $attachment = wp_insert_attachment(['post_mime_type' => wp_check_filetype($file)['type'], 'post_title' => $product->post_title, 'post_status' => 'inherit'], $target, $product->ID, true);
            if (is_wp_error($attachment)) throw new RuntimeException($attachment->get_error_message());
            wp_update_attachment_metadata($attachment, wp_generate_attachment_metadata($attachment, $target));
            update_post_meta($attachment, '_wp_attachment_image_alt', $product->post_title);
            if ($file === get_post_meta($product->ID, '_cerlab_image', true)) set_post_thumbnail($product->ID, $attachment);
            else $ids[] = $attachment;
        }
        if ($ids) update_post_meta($product->ID, '_cerlab_gallery_ids', $ids);
    }
    update_option('cerlab_demo_media_imported', true);
}
if (get_option('cerlab_demo_seeded')) { demo_import_media(); flush_rewrite_rules(false); echo "Already seeded; content preserved.\n"; exit; }
$data = json_decode(file_get_contents($root . '/research/catalogue.json'), true);
function demo_page($title, $slug, $content, $parent = 0) {
    $id = wp_insert_post(['post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title,
        'post_name' => $slug, 'post_content' => $content, 'post_parent' => $parent], true);
    if (is_wp_error($id)) throw new RuntimeException($id->get_error_message());
    return $id;
}
function gs_text($tag, $text, $class, $name) {
    $id = 'gsbp-' . substr(md5($name), 0, 7);
    $attrs = ['id' => $id, 'localId' => $id, 'tag' => $tag, 'type' => 'text', 'textContent' => $text, 'className' => $class];
    return '<!-- wp:greenshift-blocks/element ' . wp_json_encode($attrs, JSON_UNESCAPED_UNICODE) . ' --><' . $tag . ' class="' . $class . ' ' . $id . '">' . $text . '</' . $tag . '><!-- /wp:greenshift-blocks/element -->';
}
function demo_html($html) { return '<!-- wp:html -->' . $html . '<!-- /wp:html -->'; }
function demo_shortcode($shortcode) { return '<!-- wp:shortcode -->' . $shortcode . '<!-- /wp:shortcode -->'; }
$intro = 'Проектируем и изготавливаем керамические поверхности под индивидуальные задачи — от кухонных столешниц и островов до фасадов и технологически сложных решений.';
$hero_id = 'gsbp-cerhero';
$hero = '<!-- wp:greenshift-blocks/element {"id":"' . $hero_id . '","localId":"' . $hero_id . '","tag":"section","type":"inner","className":"hero"} --><section class="hero ' . $hero_id . '">';
$hero .= demo_html('<img class="hero-art" src="' . esc_url(cerlab_media('house.webp')) . '" alt="Образцы керамических плит" fetchpriority="high">');
$hero .= gs_text('h1', 'Стильные<br>керамические<br>поверхности', 'hero-title', 'hero-title');
$hero .= gs_text('p', $intro, 'hero-subtitle', 'hero-subtitle');
$hero .= '</section><!-- /wp:greenshift-blocks/element -->';
$brands = '';
foreach (['laminam-.svg', 'container-lea-ceramiche-porcelain-tiles-for-floors-and-walls.svg', 'icon-cotto-deste-porcelain-tiles-and-kerlite-for-floors-and-walls.svg', 'Dek.svg'] as $logo) $brands .= '<img src="' . esc_url(cerlab_media($logo)) . '" alt="Партнёр — производитель керамики">';
$home = $hero . demo_html('<div class="brands">' . $brands . $brands . '</div>');
$home .= demo_html('<section class="induction"><video controls muted loop playsinline preload="none" poster="' . esc_url(cerlab_media('induction-poster.jpg')) . '" src="' . esc_url(cerlab_media('induction.mp4')) . '" aria-label="Индукционная панель под керамической столешницей"></video></section>');
$home .= demo_shortcode('[cerlab_categories]') . demo_shortcode('[cerlab_products group="new"]') . demo_shortcode('[cerlab_products group="popular"]');
$home_id = demo_page('Главная', 'home', $home);
update_option('show_on_front', 'page'); update_option('page_on_front', $home_id);
$parent = demo_page('Категории', 'category', demo_shortcode('[cerlab_categories]'));
$terms = [];
foreach ($data['categories'] as $c) {
    $term = wp_insert_term($c['name'], 'cerlab_category', ['slug' => $c['slug']]);
    if (is_wp_error($term)) throw new RuntimeException($term->get_error_message());
    $tid = $term['term_id']; $terms[$c['slug']] = $tid;
    update_term_meta($tid, '_cerlab_image', $c['image']);
    $content = gs_text('h1', esc_html($c['name']), 'category-heading', 'category-' . $c['slug']);
    $content .= demo_html('<div class="category-banner"><img src="' . esc_url(cerlab_media($c['image'])) . '" alt="' . esc_attr($c['name']) . '"></div>');
    $content .= demo_shortcode('[cerlab_category]');
    $pid = demo_page($c['name'], $c['slug'], $content, $parent);
    update_post_meta($pid, '_cerlab_category_slug', $c['slug']);
    update_term_meta($tid, '_cerlab_page', $pid);
}
foreach ($data['products'] as $order => $p) {
    $id = wp_insert_post(['post_type' => 'cerlab_product', 'post_status' => 'publish', 'post_title' => $p['name'], 'post_name' => $p['slug'], 'menu_order' => $order], true);
    if (is_wp_error($id)) throw new RuntimeException($id->get_error_message());
    wp_set_object_terms($id, array_map(function ($slug) use ($terms) { return $terms[$slug]; }, $p['categories']), 'cerlab_category');
    update_post_meta($id, '_cerlab_image', $p['image']);
    update_post_meta($id, '_cerlab_gallery', $p['gallery']);
    update_post_meta($id, '_cerlab_group', $p['group']);
    update_post_meta($id, '_cerlab_source', $p['source']);
    $text = $p['description'];
    preg_match('/Типы поверхности:\s*(.*?)(?=Размеры:|\*|$)/u', $text, $surface);
    preg_match('/Размеры:\s*([0-9]+\s*[xх×]\s*[0-9]+)/u', $text, $size);
    $disclaimer = strpos($text, '*') !== false ? substr($text, strpos($text, '*')) : '';
    update_post_meta($id, '_cerlab_surface', trim($surface[1] ?? ''));
    update_post_meta($id, '_cerlab_size', trim($size[1] ?? ''));
    update_post_meta($id, '_cerlab_disclaimer', $disclaimer);
}
demo_page('О нас', 'about', gs_text('h1', 'Стильные керамические поверхности', 'category-heading', 'about-title') . '<!-- wp:paragraph --><p>' . $intro . '</p><!-- /wp:paragraph -->' . demo_html('<div class="category-banner"><img src="' . esc_url(cerlab_media('contact-form-image.webp')) . '" alt="Керамика в интерьере"></div>'));
demo_page('Контакты', 'contacts', gs_text('h1', 'Обсудим Ваш проект', 'category-heading', 'contact-title') . '<!-- wp:paragraph --><p>Это локальная проверка технологии. Форма ниже сохраняет заявку в админке этого WordPress; уведомления компании-референсу не отправляются.</p><!-- /wp:paragraph -->');
demo_page('Условия демо', 'privacy', '<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Условия локального демо</h1><!-- /wp:heading --><!-- wp:paragraph --><p>Форма сохраняет имя, телефон и комментарий в локальной базе WordPress для проверки работы. Данные не отправляются владельцам исходного сайта. Для проверки используйте вымышленные данные. Администратор может удалить заявку в разделе CERLAB — Заявки демо.</p><!-- /wp:paragraph -->');
update_option('cerlab_demo_seeded', true);
demo_import_media();
flush_rewrite_rules(false);
echo "Installed WordPress, child block theme, GreenShift, 8 products and 5 categories.\n";
