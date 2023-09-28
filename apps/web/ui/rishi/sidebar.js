import { CalendarPlus } from "@phosphor-icons/react";
import { Button } from "@ui";
import { UserRatings, UserLanguages, SidebarWrapper } from "@ui/rishi";

const Sidebar = ({ languages, callLink, callRate, userRating }) => (
  <SidebarWrapper>
    <UserRatings rating={userRating || 4} />
    <UserLanguages languages={languages || [("English", "Hindi", "German")]} />
    <div className="flex flex-col items-center gap-1">
      <Button
        variant="secondary"
        as="a"
        href={callLink || "https://cal.com"}
        className="w-full rounded-xl !border-transparent !bg-black py-2 !text-base font-medium text-white shadow-xl hover:!border-[#2e43e8] hover:!bg-[#2e43e8]">
        <CalendarPlus className="mr-1" />
        Book a call with me
      </Button>
      <span className="mt-2 text-center opacity-50">${callRate || "200"}/hr</span>
    </div>
  </SidebarWrapper>
);

export default Sidebar;
