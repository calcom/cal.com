<?php

namespace CalCom;

defined('ABSPATH') || exit;

class Cal
{
    private static $instance;

    private function includes(): void
    {
        include_once CALCOM_DIR_PATH . 'inc/class.embed.php';
    }

    private function __construct()
    {
        $this->includes();
        $embed = new \CalCom\Embed;
        $this->hooks();
        $embed->hooks();
    }

    private function hooks(): void
    {
        add_action('wp_enqueue_scripts', [$this, 'register_scripts']);
    }

    /**
     * Register needed JS scripts
     * 
     * @return void
     */
    public function register_scripts(): void
    {
        wp_register_script('calcom-embed-js', CALCOM_ASSETS_URL . 'js/embed.js');
        wp_register_style('calcom-embed-css', CALCOM_ASSETS_URL . 'css/style.css');
    }

    public static function get_instance(): self
    {

        if (!self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }
}
