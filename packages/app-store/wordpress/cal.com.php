<?php

/**
 * Plugin Name: Cal.com
 * Description: Simplest and easiest way to embed Cal.com in WordPress.
 * Author: Cal.com, Inc & Shycoder
 * Author URI: https://cal.com/
 * Version: 1.0.0
 * License: GPLv3 or later
 */

defined('ABSPATH') || exit;

defined('CALCOM_DIR_PATH')          || define('CALCOM_DIR_PATH', plugin_dir_path(__FILE__));
defined('CALCOM_DIR_URL')           || define('CALCOM_DIR_URL', plugin_dir_url(__FILE__));
defined('CALCOM_ASSETS_URL')        || define('CALCOM_ASSETS_URL', CALCOM_DIR_URL . 'assets/');

include_once CALCOM_DIR_PATH . 'inc/class.cal.com.php';

\CalCom\Cal::get_instance();
