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
            return 'URL: ' . $atts['url'];
        }

        return '';
    }

    /**
     * Sanitizes embed attributes
     * 
     * @param $atts Shortcode attributess
     * @return $array
     */
    private function prepare_atts($atts): array
    {

        if ($atts) {

            if (isset($atts['url']) && $atts['url']) {

                $url = sanitize_text_field($atts['url']);

                // ensure url is sanitized correctly
                $url = str_replace('https://cal.com/', '/', $url);

                return ['url' => $url];
            }
        }

        return [];
    }
}
