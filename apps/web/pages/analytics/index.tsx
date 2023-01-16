import Shell from "@calcom/features/shell/Shell";
import { EmptyScreen, Icon } from "@calcom/ui";

export default function AnalyticsPage() {
  const isEmpty = false;
  return (
    <div>
      <Shell heading="Analytics" subtitle="Stats for your organisations">
        {isEmpty ? (
          <EmptyScreen
            Icon={Icon.FiClock}
            headline="Coming soon"
            description="We're working on this feature"
          />
        ) : (
          ""
        )}
      </Shell>
    </div>
  );
}
