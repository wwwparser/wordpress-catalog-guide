<?php
defined('ABSPATH') || exit;
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('cerlab-prototype', get_stylesheet_directory_uri() . '/assets/site.css', [], '0.1.0');
    wp_enqueue_script('cerlab-prototype', get_stylesheet_directory_uri() . '/assets/site.js', [], '0.1.0', true);
});
add_action('after_setup_theme', function () {
    add_theme_support('post-thumbnails');
    add_editor_style('assets/site.css');
});
