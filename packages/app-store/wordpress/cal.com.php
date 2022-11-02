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

defined('CALCOM_DIR') || define('CALCOM_DIR', plugin_dir_path(__FILE__));

include_once(CALCOM_DIR . 'inc/class.cal.com.php');

\CalCom\Cal::get_instance();
