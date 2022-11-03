<?php

namespace CalCom;

defined('ABSPATH') || exit;

class Embed
{
    public function hooks(): void
    {
        add_shortcode('cal', [$this, 'shortcode']);
    }

    public function shortcode($atts): string
    {
        $atts = $this->prepare_atts($atts);
        return $this->embed($atts);
    }

    /**
     * Embeds Cal.com booking calendar
     * 
     * @param $atts Embed attributes
     * @return string
     */
    private function embed($atts): string
    {

        if ($atts) {

            $this->load_embed_scripts();

            switch ($atts['type']) {
                case 2:
                    $output = '<span id="calcom-embed-link" data-cal-link="' . esc_attr($atts['url']) . '">' . esc_attr($atts['text']) . '</span>';
                    break;
                default:
                    $output = '<div id="calcom-embed"></div>';
                    $output .= $this->get_inline_embed_script($atts['url']);
            }

            return $output;
        }

        return '';
    }

    /**
     * Adds inline embed JS
     * 
     * @param $url Booking link
     * @return string
     */
    public function get_inline_embed_script($url): string
    {
        $script = '<script>
            const selector = document.getElementById("calcom-embed");
            Cal("inline", {
                elementOrSelector: selector,
                calLink: "' . $url . '"
            });
        </script>';

        return $script;
    }

    /**
     * Enqueues registered embed scripts
     * 
     * @return void
     */
    private function load_embed_scripts(): void
    {
        wp_enqueue_script('calcom-embed-js');
        wp_enqueue_style('calcom-embed-css');
    }

    /**
     * Sanitizes embed shortcode attributes
     * 
     * @param $atts Shortcode attributess
     * @return $array
     */
    private function prepare_atts($atts): array
    {
        if ($atts) {

            $embed_url = '';
            $embed_type = '1';
            $embed_text = 'Book me';

            if (isset($atts['url']) && $atts['url']) {

                $url = sanitize_text_field($atts['url']);

                // ensure url is sanitized correctly
                $url = str_replace('https://cal.com/', '/', $url);

                $embed_url = $url;
            }

            if (isset($atts['type']) && $atts['type']) {

                if (isset($atts['text']) && $atts['text']) {

                    $embed_text = sanitize_text_field($atts['text']);
                }

                $embed_type = sanitize_text_field($atts['type']);
            }

            return ['url' => $embed_url, 'type' => $embed_type, 'text' => $embed_text];
        }

        return [];
    }
}
