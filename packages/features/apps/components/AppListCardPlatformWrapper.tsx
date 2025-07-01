import { AppListCard } from "@calcom/ui/components/app-list-card";
import type { AppListCardProps } from "@calcom/ui/components/app-list-card";

export default function AppListCardPlatformWrapper(props: AppListCardProps) {
  const logo = `https://app.cal.com${props.logo}`;
  return <AppListCard {...props} logo={logo} />;
}
