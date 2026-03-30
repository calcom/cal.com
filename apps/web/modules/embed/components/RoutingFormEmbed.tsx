import type { ComponentProps } from "react";

import { EmbedDialog, EmbedButton } from "@calcom/web/modules/embed/components/Embed";
import { IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { tabs } from "@calcom/features/embed/lib/EmbedTabs";
import { useEmbedTypes } from "@calcom/features/embed/lib/hooks";

export const RoutingFormEmbedDialog = () => {
  const types = useEmbedTypes();
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.get.useQuery();
  const routingFormTypes = types.filter((type) => type.type !== "email");

  // Add the headless option specifically for routing forms
  const headlessType = {
    title: t("use_my_own_form"),
    subtitle: t("use_our_headless_routing_api"),
    type: "headless",
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
        <rect x="24" y="50.5" width="139" height="163" rx="6" fill="#F8F8F8" />
        <g opacity="0.8">
          <rect x="42" y="74" width="20" height="20" rx="2" fill="#374151" />
          <path
            d="M48 81L52 85L56 81"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <rect x="48" y="106" width="80" height="8" rx="6" fill="#F3F4F6" />
        <rect x="48" y="118" width="48" height="4" rx="6" fill="#F3F4F6" />
        <rect x="48" y="130" width="64" height="4" rx="6" fill="#F3F4F6" />
        <rect x="48" y="142" width="32" height="4" rx="6" fill="#F3F4F6" />
        <rect x="48" y="160" width="72" height="6" rx="3" fill="#292929" />
        <rect x="176" y="50.5" width="108" height="164" rx="6" fill="#F3F4F6" />
        <text x="220" y="120" textAnchor="middle" className="fill-gray-400" fontSize="8">
          API
        </text>
        <rect x="200" y="125" width="40" height="2" rx="1" fill="#9CA3AF" />
        <rect x="200" y="130" width="32" height="2" rx="1" fill="#9CA3AF" />
        <rect x="200" y="135" width="36" height="2" rx="1" fill="#9CA3AF" />
        <rect x="24" y="226.5" width="260" height="38.5" rx="6" fill="#F3F4F6" />
      </svg>
    ),
  };

  const routingFormTypesWithHeadless = IS_CALCOM ? [...routingFormTypes, headlessType] : routingFormTypes;

  return (
    <EmbedDialog
      types={routingFormTypesWithHeadless}
      tabs={tabs}
      eventTypeHideOptionDisabled={true}
      defaultBrandColor={user ? { brandColor: user.brandColor, darkBrandColor: user.darkBrandColor } : null}
      noQueryParamMode={true}
    />
  );
};

export const RoutingFormEmbedButton = (props: ComponentProps<typeof EmbedButton>) => {
  return <EmbedButton {...props} noQueryParamMode={true} />;
};
