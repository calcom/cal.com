import { Clock } from "@calcom/ui/components/icon";

import { EmptyScreen } from "./EmptyScreen";

export function AvailabilityList({ schedules }: { schedules: [] }) {
  return (
    <>
      {schedules.length === 0 ? (
        <div>
          <EmptyScreen
            Icon={Clock}
            headline="Create an availability schedule"
            subtitle="Creating availability schedules allows you to manage availability across event types. They can be applied to one or more event types."
            className="w-full"
          />
        </div>
      ) : (
        <div>
          Render availability list here
          <div>
            {schedules.map((schedule) => (
              <h1 key={schedule?.id}>Hi</h1>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
