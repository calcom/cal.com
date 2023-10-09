import { EmptyScreen } from " ./EmptyScreen";

export function AvailabilityList({ schedules }: []) {
  return (
    <>
      {schedules.length === 0 ? (
        <div>
          <EmptyScreen className="w-full" />
        </div>
      ) : (
        <div>Render availability list here</div>
      )}
    </>
  );
}
