import { useMemo } from "react";

import { useIsPlatform } from "@calcom/atoms/hooks/useIsPlatform";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

export const LayoutToggle = ({
  onLayoutToggle,
  layout,
  enabledLayouts,
}: {
  onLayoutToggle: (layout: BookerLayouts) => void;
  layout: BookerLayouts;
  enabledLayouts?: BookerLayouts[];
}) => {
  const isEmbed = useIsEmbed();
  const isPlatform = useIsPlatform();

  const { t } = useLocale();

  const options = useMemo(() => {
    return layoutOptions(t, enabledLayouts);
  }, [t, enabledLayouts]);

  if (!options) return null;
  // We don't want to show the layout toggle in embed mode as of now as it doesn't look rightly placed when embedded.
  // There is a Embed API to control the layout toggle from outside of the iframe.
  if (isEmbed) return null;

  // just like embed the layout toggle doesn't look rightly placed in platform
  // the layout can be toggled via props in the booker atom
  if (isPlatform) return null;

  return <ToggleGroup onValueChange={onLayoutToggle} value={layout} options={options} />;
};

export function layoutOptions(t: (key: string) => string, enabledLayouts?: BookerLayouts[]) {
  if (!enabledLayouts) return null;

  const optionParams = [
    {
      value: BookerLayouts.MONTH_VIEW,
      icon: "calendar",
      txt: "switch_monthly",
    },
    {
      value: BookerLayouts.WEEK_VIEW,
      icon: "grid-3x3",
      txt: "switch_weekly",
    },
    {
      value: BookerLayouts.COLUMN_VIEW,
      icon: "columns-3",
      txt: "switch_columnview",
    },
  ];

  return optionParams
    .map((params) => ({
      value: params.value,
      label: (
        <>
          <Icon name={params.icon} width="16" height="16" />
          <span className="sr-only">{t(params.txt)}</span>
        </>
      ),
      tooltip: t(params.txt),
    }))
    .filter((option) => enabledLayouts?.includes(option.value as BookerLayouts));
}
