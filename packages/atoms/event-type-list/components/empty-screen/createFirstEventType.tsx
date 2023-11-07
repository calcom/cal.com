import { Button } from "@/components/ui/button";
import { EmptyScreen } from "event-type-list/components/empty-screen";
import { LinkIcon } from "lucide-react";

export function CreateFirstEventTypeView({ slug }: { slug: string }) {
  return (
    <>
      <EmptyScreen
        Icon={LinkIcon}
        className="mb-16"
        headline="Create your first event type"
        description="Event types enable you to share links that show available times on your calendar and allow people to make bookings with you."
        buttonRaw={
          <Button>
            <a href={`?dialog=new&eventPage=${slug}`}>Create</a>
          </Button>
        }
      />
    </>
  );
}
