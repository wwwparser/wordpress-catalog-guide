<?php
/**
 * Plugin Name: Cerlab Catalogue Prototype
 * Description: Reusable catalogue data, fields and local enquiry storage.
 * Version: 0.1.0
 */
defined('ABSPATH') || exit;

function cerlab_register_types() {
    // Editorial category pages use the reference's /category/ path.
    add_rewrite_rule('^category/([^/]+)/?$', 'index.php?pagename=category/$matches[1]', 'top');
    wp_register_script('cerlab-catalog-editor', plugins_url('editor.js', __FILE__), ['wp-blocks', 'wp-element', 'wp-server-side-render'], '0.1.0', true);
    foreach (['header' => 'Шапка', 'footer' => 'Подвал', 'product' => 'Карточка товара', 'enquiry' => 'Форма заявки', 'categories' => 'Категории', 'products' => 'Товары', 'category' => 'Товары категории'] as $name => $title) {
        if (!WP_Block_Type_Registry::get_instance()->is_registered('cerlab/' . $name)) {
            register_block_type('cerlab/' . $name, ['api_version' => 3, 'title' => 'CERLAB: ' . $title, 'category' => 'widgets',
                'editor_script' => 'cerlab-catalog-editor', 'attributes' => ['group' => ['type' => 'string', 'default' => 'new']],
                'render_callback' => function ($attrs) use ($name) { return do_shortcode('[cerlab_' . $name . ' group="' . esc_attr($attrs['group'] ?? 'new') . '"]'); }]);
        }
    }
    register_post_type('cerlab_product', [
        'labels' => ['name' => 'CERLAB — Товары', 'singular_name' => 'Товар', 'add_new_item' => 'Добавить товар'],
        'public' => true, 'show_in_rest' => true, 'menu_icon' => 'dashicons-store',
        'supports' => ['title', 'editor', 'thumbnail', 'custom-fields'],
        'rewrite' => ['slug' => 'product'], 'has_archive' => false,
    ]);
    register_taxonomy('cerlab_category', 'cerlab_product', [
        'labels' => ['name' => 'Категории', 'singular_name' => 'Категория'],
        'public' => true, 'hierarchical' => true, 'show_in_rest' => true,
        'rewrite' => ['slug' => 'collection'],
    ]);
    register_post_type('cerlab_lead', [
        'labels' => ['name' => 'Заявки демо', 'singular_name' => 'Заявка'],
        'public' => false, 'show_ui' => true, 'show_in_menu' => 'edit.php?post_type=cerlab_product',
        'supports' => ['title', 'editor'], 'capabilities' => ['create_posts' => 'do_not_allow'], 'map_meta_cap' => true,
    ]);
    foreach (['sku', 'surface', 'size', 'image', 'disclaimer'] as $key) {
        register_post_meta('cerlab_product', '_cerlab_' . $key, [
            'type' => 'string', 'single' => true, 'show_in_rest' => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback' => function ($allowed, $meta_key, $post_id) { return current_user_can('edit_post', $post_id); },
        ]);
    }
}
add_action('init', 'cerlab_register_types');

function cerlab_media($name) {
    return get_stylesheet_directory_uri() . '/assets/media/' . rawurlencode(basename($name));
}
function cerlab_category_url($term) {
    $page = (int) get_term_meta($term->term_id, '_cerlab_page', true);
    return $page ? get_permalink($page) : get_term_link($term);
}
function cerlab_picture($post_id, $large = false) {
    if (has_post_thumbnail($post_id)) {
        return get_the_post_thumbnail($post_id, $large ? 'large' : 'medium_large', ['loading' => 'lazy']);
    }
    $name = get_post_meta($post_id, '_cerlab_image', true);
    return $name ? '<img src="' . esc_url(cerlab_media($name)) . '" alt="' . esc_attr(get_the_title($post_id)) . '" loading="lazy">' : '';
}
function cerlab_cards($posts) {
    $html = '<div class="product-grid">';
    foreach ($posts as $p) {
        $html .= '<a class="product-card" href="' . esc_url(get_permalink($p)) . '"><div class="product-image">' . cerlab_picture($p->ID) . '</div><div class="card-caption"><span>' . esc_html($p->post_title) . '</span><span aria-hidden="true">↗</span></div></a>';
    }
    return $html . '</div>';
}
add_shortcode('cerlab_categories', function () {
    $terms = get_terms(['taxonomy' => 'cerlab_category', 'hide_empty' => false, 'orderby' => 'term_id']);
    $html = '<section class="section" id="categories"><h2>Категории</h2><div class="category-grid">';
    foreach ($terms as $t) {
        $image = get_term_meta($t->term_id, '_cerlab_image', true);
        $html .= '<a class="category-card" href="' . esc_url(cerlab_category_url($t)) . '"><img src="' . esc_url(cerlab_media($image)) . '" alt="' . esc_attr($t->name) . '" loading="lazy"><span>' . esc_html($t->name) . '</span></a>';
    }
    return $html . '</div></section>';
});
add_shortcode('cerlab_products', function ($atts) {
    $a = shortcode_atts(['group' => 'new'], $atts);
    $group = $a['group'] === 'popular' ? 'popular' : 'new';
    $posts = get_posts(['post_type' => 'cerlab_product', 'numberposts' => 4, 'orderby' => 'menu_order', 'order' => 'ASC', 'meta_key' => '_cerlab_group', 'meta_value' => $group]);
    return '<section class="section"><h2>' . ($group === 'new' ? 'Новинки' : 'Популярное') . '</h2>' . cerlab_cards($posts) . '</section>';
});
add_shortcode('cerlab_category', function () {
    $slug = get_post_meta(get_the_ID(), '_cerlab_category_slug', true);
    $term = get_term_by('slug', $slug, 'cerlab_category');
    if (!$term) return '';
    $posts = get_posts(['post_type' => 'cerlab_product', 'numberposts' => -1,
        'tax_query' => [['taxonomy' => 'cerlab_category', 'field' => 'term_id', 'terms' => $term->term_id]]]);
    if (!$posts) return '<p class="category-note">Проектируем и изготавливаем изделия по индивидуальным размерам. Обсудить проект можно через форму ниже.</p>';
    return '<section class="section category-products">' . cerlab_cards($posts) . '</section>';
});
add_shortcode('cerlab_product', function () {
    $id = get_the_ID();
    $terms = get_the_terms($id, 'cerlab_category');
    $term = is_array($terms) ? $terms[0] : null;
    $html = '<nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="' . esc_url(home_url('/')) . '">Главная</a> / ';
    if ($term) $html .= '<a href="' . esc_url(cerlab_category_url($term)) . '">' . esc_html($term->name) . '</a> / ';
    $html .= esc_html(get_the_title()) . '</nav><article class="product-detail"><div class="product-gallery">';
    $attachments = get_post_meta($id, '_cerlab_gallery_ids', true);
    $gallery = get_post_meta($id, '_cerlab_gallery', true);
    if (is_array($attachments) && $attachments) {
        foreach ($attachments as $attachment) $html .= wp_get_attachment_image((int)$attachment, 'large', false, ['loading' => 'lazy']);
    } elseif (is_array($gallery) && $gallery) {
        foreach ($gallery as $file) $html .= '<img src="' . esc_url(cerlab_media($file)) . '" alt="' . esc_attr(get_the_title()) . '" loading="lazy">';
    } else $html .= cerlab_picture($id, true);
    $html .= '</div><div class="product-info"><h1>' . esc_html(get_the_title()) . '</h1><dl>';
    foreach (['sku' => 'Артикул', 'surface' => 'Тип поверхности', 'size' => 'Размеры, мм'] as $key => $label) {
        $value = get_post_meta($id, '_cerlab_' . $key, true);
        if ($value !== '') $html .= '<dt>' . esc_html($label) . '</dt><dd>' . esc_html($value) . '</dd>';
    }
    $html .= '</dl><p class="muted">' . esc_html(get_post_meta($id, '_cerlab_disclaimer', true)) . '</p><a class="text-link" href="#enquiry">Обсудить проект ↗</a></div></article>';
    return $html;
});
add_shortcode('cerlab_header', function () {
    $terms = get_terms(['taxonomy' => 'cerlab_category', 'hide_empty' => false]);
    ob_start(); ?>
    <header class="site-header">
        <a class="logo" href="<?php echo esc_url(home_url('/')); ?>" aria-label="Cerlab — главная"><img src="<?php echo esc_url(cerlab_media('logo1.svg')); ?>" alt="Cerlab"></a>
        <button class="menu-toggle" aria-expanded="false" aria-controls="main-nav">Меню <span aria-hidden="true">☰</span></button>
        <nav id="main-nav" class="main-nav" aria-label="Основное меню">
            <a href="<?php echo esc_url(home_url('/')); ?>">Главная</a>
            <details class="catalog-menu"><summary>Каталог</summary><div><?php foreach ($terms as $t) echo '<a href="' . esc_url(cerlab_category_url($t)) . '">' . esc_html($t->name) . '</a>'; ?></div></details>
            <a href="<?php echo esc_url(home_url('/about/')); ?>">О нас</a>
            <a href="<?php echo esc_url(home_url('/contacts/')); ?>">Контакты</a>
        </nav>
        <a class="header-contact" href="#enquiry" aria-label="Связаться по поводу проекта">↗</a>
    </header>
    <?php return preg_replace('/>\s+</', '><', trim(ob_get_clean()));
});
add_shortcode('cerlab_footer', function () {
    return '<footer class="site-footer"><a class="logo" href="' . esc_url(home_url('/')) . '"><img src="' . esc_url(cerlab_media('logo1.svg')) . '" alt="Cerlab"></a><div><a href="' . esc_url(home_url('/about/')) . '">О нас</a><a href="' . esc_url(home_url('/contacts/')) . '">Контакты</a></div><p>Локальная учебная копия по видео Nikita Iudin.<br>Изображения: cer-lab.ru. Заявки сохраняются только в этом демо.</p></footer>';
});
add_shortcode('cerlab_enquiry', function () {
    ob_start(); ?>
    <section id="enquiry" class="section enquiry"><div><h2>Есть вопросы?</h2><p>Оставьте ваши контакты и я свяжусь с Вами.</p>
    <?php if (isset($_GET['enquiry']) && $_GET['enquiry'] === 'saved') echo '<p role="status">Заявка сохранена в локальной админке демо.</p>'; ?>
    <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="cerlab_enquiry">
        <?php wp_nonce_field('cerlab_enquiry', 'cerlab_nonce'); ?>
        <label>Ваше имя<input required name="name" autocomplete="name" maxlength="100"></label>
        <label>Телефон<input required name="phone" type="tel" autocomplete="tel" maxlength="30" pattern="[+0-9 ()-]{7,30}"></label>
        <label>Комментарий<textarea name="comment" maxlength="2000" rows="3"></textarea></label>
        <label class="honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
        <label class="consent"><input type="checkbox" name="consent" value="1" required> Согласен с <a href="<?php echo esc_url(home_url('/privacy/')); ?>">условиями обработки данных</a></label>
        <button type="submit">Отправить</button>
    </form></div><img src="<?php echo esc_url(cerlab_media('contact-form-image.webp')); ?>" alt="Керамическая раковина в интерьере" loading="lazy"></section>
    <?php return preg_replace('/>\s+</', '><', trim(ob_get_clean()));
});
function cerlab_save_enquiry() {
    if (!isset($_POST['cerlab_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['cerlab_nonce'])), 'cerlab_enquiry')) wp_die('Форма устарела. Обновите страницу.', '', ['response' => 403]);
    $name = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
    $phone = sanitize_text_field(wp_unslash($_POST['phone'] ?? ''));
    if (!empty($_POST['website']) || empty($_POST['consent']) || !$name || strlen($name) > 300 || !preg_match('/^[+0-9 ()-]{7,30}$/', $phone)) wp_die('Проверьте имя, телефон и согласие.', '', ['response' => 400]);
    $result = wp_insert_post(['post_type' => 'cerlab_lead', 'post_status' => 'private', 'post_title' => $name,
        'post_content' => $phone . "\n" . mb_substr(sanitize_textarea_field(wp_unslash($_POST['comment'] ?? '')), 0, 2000)], true);
    if (is_wp_error($result)) wp_die('Не удалось сохранить заявку.', '', ['response' => 500]);
    wp_safe_redirect(add_query_arg('enquiry', 'saved', home_url('/')) . '#enquiry'); exit;
}
add_action('admin_post_cerlab_enquiry', 'cerlab_save_enquiry');
add_action('admin_post_nopriv_cerlab_enquiry', 'cerlab_save_enquiry');

add_action('add_meta_boxes', function () {
    add_meta_box('cerlab-fields', 'Характеристики и галерея', function ($post) {
        wp_nonce_field('cerlab_fields', 'cerlab_fields_nonce');
        foreach (['sku' => 'Артикул', 'surface' => 'Тип поверхности', 'size' => 'Размеры, мм', 'disclaimer' => 'Примечание'] as $key => $label) {
            echo '<p><label>' . esc_html($label) . '<br><input class="widefat" name="cerlab_' . esc_attr($key) . '" value="' . esc_attr(get_post_meta($post->ID, '_cerlab_' . $key, true)) . '"></label></p>';
        }
        $ids = get_post_meta($post->ID, '_cerlab_gallery_ids', true);
        echo '<input type="hidden" id="cerlab-gallery-ids" name="cerlab_gallery_ids" value="' . esc_attr(is_array($ids) ? implode(',', $ids) : '') . '"><div id="cerlab-gallery-preview" style="display:flex;gap:10px;flex-wrap:wrap">';
        foreach (is_array($ids) ? $ids : [] as $attachment) echo wp_get_attachment_image((int)$attachment, 'thumbnail');
        echo '</div><p><button type="button" class="button" id="cerlab-gallery-select">Выбрать фотографии</button> <button type="button" class="button" id="cerlab-gallery-clear">Очистить выбор</button></p><p>Фото можно загрузить с компьютера или выбрать из медиатеки. Миниатюра задаётся полем «Изображение записи».</p>';
        $group = get_post_meta($post->ID, '_cerlab_group', true);
        echo '<p><label>Блок на главной <select name="cerlab_group"><option value="">Нет</option><option value="new" ' . selected($group, 'new', false) . '>Новинки</option><option value="popular" ' . selected($group, 'popular', false) . '>Популярное</option></select></label></p>';
    }, 'cerlab_product', 'normal');
});
add_action('admin_enqueue_scripts', function () {
    $screen = get_current_screen();
    if ($screen && $screen->post_type === 'cerlab_product') {
        wp_enqueue_media();
        wp_enqueue_script('cerlab-gallery-admin', plugins_url('admin.js', __FILE__), ['media-views'], '0.1.0', true);
    }
});
add_action('save_post_cerlab_product', function ($id) {
    if (wp_is_post_autosave($id) || wp_is_post_revision($id) || !current_user_can('edit_post', $id) || !isset($_POST['cerlab_fields_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['cerlab_fields_nonce'])), 'cerlab_fields')) return;
    foreach (['sku', 'surface', 'size', 'disclaimer'] as $key) update_post_meta($id, '_cerlab_' . $key, sanitize_text_field(wp_unslash($_POST['cerlab_' . $key] ?? '')));
    $group = sanitize_key($_POST['cerlab_group'] ?? '');
    update_post_meta($id, '_cerlab_group', in_array($group, ['new', 'popular'], true) ? $group : '');
    $ids = array_filter(array_map('absint', explode(',', sanitize_text_field(wp_unslash($_POST['cerlab_gallery_ids'] ?? '')))), function ($attachment) { return wp_attachment_is_image($attachment); });
    update_post_meta($id, '_cerlab_gallery_ids', array_values($ids));
});
