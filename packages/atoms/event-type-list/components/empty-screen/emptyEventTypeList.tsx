import { Button } from "@/components/ui/button";
import { EmptyScreen } from "event-type-list/components/empty-screen";

export function EmptyEventTypeList({ group }: { group: any }) {
  return (
    <>
      <EmptyScreen
        headline="This team has no event types"
        buttonRaw={
          <Button type="button" className="mt-5">
            <a href={`?dialog=new&eventPage=${group.profile.slug}&teamId=${group.teamId}`}>Create</a>
          </Button>
        }
      />
    </>
  );
}
