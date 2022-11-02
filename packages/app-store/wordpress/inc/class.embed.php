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

            $output = '<div id="calcom-embed"></div>';

            $this->load_embed_script();
            $output .= $this->get_inline_embed_script($atts['url']);

            return $output;
        }

        return '';
    }

    /**
     * Adds inline embed js
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
     * Enqueues embed script
     * 
     * @return void
     */
    private function load_embed_script(): void
    {
        wp_enqueue_script('calcom-embed-js');
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
