<?php

namespace CalCom;

defined('ABSPATH') || exit;

class Cal
{
    private static $instance;

    private function includes(): void
    {
        include_once(CALCOM_DIR . 'inc/class.embed.php');
    }

    private function __construct()
    {
        $this->includes();
        $embed = new \CalCom\Embed;
        $embed->hooks();
    }

    // private function hooks(): void
    // {
    // }

    public static function get_instance(): self
    {

        if (!self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }
}
