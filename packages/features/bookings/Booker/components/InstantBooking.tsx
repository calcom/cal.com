import { AvatarGroup, Button } from "@calcom/ui";

export const InstantBooking = () => {
  const isTeam = true;
  const username = "Peer"; // if not a team

  return (
    <div className=" bg-default border-subtle shadow-xs flex items-center gap-3 rounded-xl border p-[6px] text-sm delay-1000">
      <div className="relative flex items-center ps-1">
        {/* TODO: max. show 4 people here */}
        <AvatarGroup
          size="sm"
          className="relative"
          items={[
            {
              image: "https://cal.com/stakeholder/peer.jpg",
              alt: "Peer",
              title: "Peer Richelsen",
            },
            {
              image: "https://cal.com/stakeholder/bailey.jpg",
              alt: "Bailey",
              title: "Bailey Pumfleet",
            },
            {
              image: "https://cal.com/stakeholder/alex-van-andel.jpg",
              alt: "Alex",
              title: "Alex Van Andel",
            },
          ]}
        />
        <div className="border-muted absolute -bottom-0.5 -right-1 h-2 w-2 rounded-full border bg-green-500" />
      </div>
      <div>
        <strong className="text-emphasis font-medium">{isTeam ? "Someone" : username}</strong> is available
        right now!
      </div>
      <div>
        <Button color="primary" size="sm" className="rounded-lg">
          Join Call
        </Button>
      </div>
    </div>
  );
};
