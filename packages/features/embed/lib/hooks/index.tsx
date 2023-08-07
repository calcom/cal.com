import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";

export const useEmbedTypes = () => {
  const { t } = useLocale();
  return [
    {
      title: t("inline_embed"),
      subtitle: t("load_inline_content"),
      type: "inline",
      illustration: (
        <svg
          width="100%"
          height="100%"
          className="rounded-md"
          viewBox="0 0 308 265"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 1.99999C0 0.895423 0.895431 0 2 0H306C307.105 0 308 0.895431 308 2V263C308 264.105 307.105 265 306 265H2C0.895431 265 0 264.105 0 263V1.99999Z"
            fill="white"
          />
          <rect x="24" width="260" height="38.5" rx="6" fill="#F3F4F6" />
          <rect x="24.5" y="51" width="139" height="163" rx="1.5" fill="#F8F8F8" />
          <rect opacity="0.8" x="48" y="74.5" width="80" height="8" rx="6" fill="#F3F4F6" />
          <rect x="48" y="86.5" width="48" height="4" rx="6" fill="#F3F4F6" />
          <rect x="49" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="61" y="99.5" width="6" height="6" rx="1" fill="#3E3E3E" />
          <rect x="73" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="85" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="97" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="109" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="121" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="133" y="99.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="85" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="97" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="109" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="121" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="133" y="113.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="49" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="61" y="125.5" width="6" height="6" rx="1" fill="#3E3E3E" />
          <path
            d="M61 124.5H67V122.5H61V124.5ZM68 125.5V131.5H70V125.5H68ZM67 132.5H61V134.5H67V132.5ZM60 131.5V125.5H58V131.5H60ZM61 132.5C60.4477 132.5 60 132.052 60 131.5H58C58 133.157 59.3431 134.5 61 134.5V132.5ZM68 131.5C68 132.052 67.5523 132.5 67 132.5V134.5C68.6569 134.5 70 133.157 70 131.5H68ZM67 124.5C67.5523 124.5 68 124.948 68 125.5H70C70 123.843 68.6569 122.5 67 122.5V124.5ZM61 122.5C59.3431 122.5 58 123.843 58 125.5H60C60 124.948 60.4477 124.5 61 124.5V122.5Z"
            fill="#3E3E3E"
          />
          <rect x="73" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="85" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="97" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="109" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="121" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="133" y="125.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="49" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="61" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="73" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="85" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="97" y="137.5" width="6" height="6" rx="1" fill="#3E3E3E" />
          <rect x="109" y="137.5" width="6" height="6" rx="1" fill="#3E3E3E" />
          <rect x="121" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="133" y="137.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="49" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="61" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="73" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="85" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="97" y="149.5" width="6" height="6" rx="1" fill="#3E3E3E" />
          <rect x="109" y="149.5" width="6" height="6" rx="1" fill="#3E3E3E" />
          <rect x="121" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="133" y="149.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="49" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="61" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="73" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="85" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="97" y="161.5" width="6" height="6" rx="1" fill="#3E3E3E" />
          <rect x="109" y="161.5" width="6" height="6" rx="1" fill="#C6C6C6" />
          <rect x="24.5" y="51" width="139" height="163" rx="6" stroke="#292929" />
          <rect x="176" y="50.5" width="108" height="164" rx="6" fill="#F3F4F6" />
          <rect x="24" y="226.5" width="260" height="38.5" rx="6" fill="#F3F4F6" />
        </svg>
      ),
    },
    {
      title: t("floating_pop_up_button"),
      subtitle: t("floating_button_trigger_modal"),
      type: "floating-popup",
      illustration: (
        <svg
          width="100%"
          height="100%"
          className="rounded-md"
          viewBox="0 0 308 265"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 1.99999C0 0.895423 0.895431 0 2 0H306C307.105 0 308 0.895431 308 2V263C308 264.105 307.105 265 306 265H2C0.895431 265 0 264.105 0 263V1.99999Z"
            fill="white"
          />
          <rect x="24" width="260" height="38.5" rx="6" fill="#F3F4F6" />
          <rect x="24" y="50.5" width="120" height="76" rx="6" fill="#F3F4F6" />
          <rect x="24" y="138.5" width="120" height="76" rx="6" fill="#F3F4F6" />
          <rect x="156" y="50.5" width="128" height="164" rx="6" fill="#F3F4F6" />
          <rect x="24" y="226.5" width="260" height="38.5" rx="6" fill="#F3F4F6" />
          <rect x="226" y="223.5" width="66" height="26" rx="6" fill="#292929" />
          <rect x="242" y="235.5" width="34" height="2" rx="1" fill="white" />
        </svg>
      ),
    },
    {
      title: t("pop_up_element_click"),
      subtitle: t("open_dialog_with_element_click"),
      type: "element-click",
      illustration: (
        <svg
          width="100%"
          height="100%"
          className="rounded-md"
          viewBox="0 0 308 265"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 1.99999C0 0.895423 0.895431 0 2 0H306C307.105 0 308 0.895431 308 2V263C308 264.105 307.105 265 306 265H2C0.895431 265 0 264.105 0 263V1.99999Z"
            fill="white"
          />
          <rect x="24" y="0.50293" width="260" height="24" rx="6" fill="#F3F4F6" />
          <rect x="24" y="35" width="259" height="192" rx="5.5" fill="#F9FAFB" />
          <g filter="url(#filter0_i_3223_14162)">
            <rect opacity="0.8" x="40" y="99" width="24" height="24" rx="2" fill="#E5E7EB" />
            <rect x="40" y="127" width="48" height="8" rx="1" fill="#E5E7EB" />
            <rect x="40" y="139" width="82" height="8" rx="1" fill="#E5E7EB" />
            <rect x="40" y="151" width="34" height="4" rx="1" fill="#E5E7EB" />
            <rect x="40" y="159" width="34" height="4" rx="1" fill="#E5E7EB" />
          </g>
          <rect x="152" y="48" width="2" height="169" rx="2" fill="#E5E7EB" />

          <rect opacity="0.8" x="176" y="84" width="80" height="8" rx="2" fill="#E5E7EB" />
          <rect x="176" y="96" width="48" height="4" rx="1" fill="#E5E7EB" />
          <rect x="177" y="109" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="189" y="109" width="6" height="6" rx="1" fill="#0D121D" />
          <rect x="201" y="109" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="213" y="109" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="225" y="109" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="237" y="109" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="249" y="109" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="261" y="109" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="213" y="123" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="225" y="123" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="237" y="123" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="249" y="123" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="261" y="123" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="177" y="135" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="189" y="135" width="6" height="6" rx="1" fill="#0D121D" />
          <rect x="187.3" y="133.4" width="9" height="9" rx="1.5" stroke="#0D121D" />
          <rect x="201" y="135" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="213" y="135" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="225" y="135" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="237" y="135" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="249" y="135" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="261" y="135" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="177" y="147" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="189" y="147" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="201" y="147" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="213" y="147" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="225" y="147" width="6" height="6" rx="1" fill="#0D121D" />
          <rect x="237" y="147" width="6" height="6" rx="1" fill="#0D121D" />
          <rect x="249" y="147" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="261" y="147" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="177" y="159" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="189" y="159" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="201" y="159" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="213" y="159" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="225" y="159" width="6" height="6" rx="1" fill="#0D121D" />
          <rect x="237" y="159" width="6" height="6" rx="1" fill="#0D121D" />
          <rect x="249" y="159" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="261" y="159" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="177" y="171" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="189" y="171" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="201" y="171" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="213" y="171" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="225" y="171" width="6" height="6" rx="1" fill="#0D121D" />
          <rect x="237" y="171" width="6" height="6" rx="1" fill="#E5E7EB" />
          <rect x="24" y="35" width="259" height="192" rx="5.5" stroke="#101010" />
          <rect x="24" y="241.503" width="260" height="24" rx="6" fill="#F3F4F6" />
        </svg>
      ),
    },
    {
      title: t("email_embed"),
      subtitle: t("add_times_to_your_email"),
      type: "email",
      illustration: (
        <svg
          width="100%"
          height="100%"
          className="rounded-md"
          viewBox="0 0 308 265"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_457_1339)">
            <rect width="308" height="265" rx="8" fill="white" />
            <rect width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="19" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="38" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="57" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="76" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="95" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="114" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="133" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="152" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="171" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="190" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="209" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="228" width="308" height="18" rx="4" fill="#F3F4F6" />
            <rect y="247" width="308" height="18" rx="4" fill="#F3F4F6" />
            <g clip-path="url(#clip1_457_1339)">
              <rect x="107" y="64" width="189" height="189" rx="6" fill="white" />
              <g clip-path="url(#clip2_457_1339)">
                <path
                  d="M124.671 75.5243C124.671 75.1018 124.325 74.756 123.902 74.756H117.756C117.334 74.756 116.988 75.1018 116.988 75.5243M124.671 75.5243V80.1341C124.671 80.5567 124.325 80.9024 123.902 80.9024H117.756C117.334 80.9024 116.988 80.5567 116.988 80.1341V75.5243M124.671 75.5243L120.829 78.2134L116.988 75.5243"
                  stroke="#9CA3AF"
                  stroke-width="1.15244"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <rect x="130.049" y="75.5244" width="92.1951" height="4.60976" rx="2.30488" fill="#D1D5DB" />
              <rect x="130.049" y="84.7439" width="55.3171" height="4.60976" rx="2.30488" fill="#E5E7EB" />
              <rect
                opacity="0.8"
                x="107"
                y="98.5732"
                width="189"
                height="1.15244"
                rx="0.576219"
                fill="#E5E7EB"
              />
              <rect x="116.219" y="113.555" width="92.1951" height="4.60976" rx="2.30488" fill="#D1D5DB" />
              <rect x="116.219" y="122.774" width="42.6402" height="4.60976" rx="2.30488" fill="#E5E7EB" />
              <rect x="116.219" y="136.604" width="55.3171" height="4.60976" rx="2.30488" fill="#D1D5DB" />
              <rect x="116.719" y="145.171" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="142.073" y="145.171" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="167.427" y="145.171" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="192.781" y="145.171" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="218.134" y="145.171" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="116.219" y="160.805" width="55.3171" height="4.60976" rx="2.30488" fill="#D1D5DB" />
              <rect x="116.719" y="169.372" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="142.073" y="169.372" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="167.427" y="169.372" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="192.781" y="169.372" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="218.134" y="169.372" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="116.219" y="185.006" width="55.3171" height="4.60976" rx="2.30488" fill="#D1D5DB" />
              <rect x="116.719" y="193.573" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="142.073" y="193.573" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="167.427" y="193.573" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="192.781" y="193.573" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect x="218.134" y="193.573" width="22.0488" height="5.91463" rx="2.95732" stroke="#9CA3AF" />
              <rect
                opacity="0.8"
                x="107"
                y="223.037"
                width="189"
                height="1.15244"
                rx="0.576219"
                fill="#E5E7EB"
              />
              <rect width="189" height="28.811" transform="translate(107 224.189)" fill="#F9FAFB" />
              <rect x="116.219" y="233.985" width="23.0488" height="9.21951" rx="2.30488" fill="#9CA3AF" />
              <rect
                opacity="0.8"
                x="141.573"
                y="233.985"
                width="9.21951"
                height="9.21951"
                rx="2.30488"
                fill="#E5E7EB"
              />
              <rect
                opacity="0.8"
                x="153.098"
                y="233.985"
                width="9.21951"
                height="9.21951"
                rx="2.30488"
                fill="#E5E7EB"
              />
              <rect
                opacity="0.8"
                x="164.622"
                y="233.985"
                width="9.21951"
                height="9.21951"
                rx="2.30488"
                fill="#E5E7EB"
              />
            </g>
            <rect
              x="106.424"
              y="63.4238"
              width="190.152"
              height="190.152"
              rx="6.57622"
              stroke="#101010"
              stroke-width="1.15244"
            />
          </g>
          <rect x="0.5" y="0.5" width="307" height="264" rx="7.5" stroke="#E5E7EB" />
          <defs>
            <clipPath id="clip0_457_1339">
              <rect width="308" height="265" rx="8" fill="white" />
            </clipPath>
            <clipPath id="clip1_457_1339">
              <rect x="107" y="64" width="189" height="189" rx="6" fill="white" />
            </clipPath>
            <clipPath id="clip2_457_1339">
              <rect width="9.21951" height="9.21951" fill="white" transform="translate(116.219 73.2195)" />
            </clipPath>
          </defs>
        </svg>
      ),
    },
  ];
};

export const useEmbedCalOrigin = () => {
  const bookerUrl = useBookerUrl();
  return bookerUrl;
};
