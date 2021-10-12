import { useLocale } from "@lib/hooks/useLocale";
import { inferQueryOutput } from "@lib/trpc";

import UserCalendarIllustration from "@components/ui/svg/UserCalendarIllustration";

import CreateNewEventDialog from "./CreateNewEventDialog";

type Profiles = inferQueryOutput<"viewer.eventTypes">["profiles"];

interface Props {
  canAddEvents: boolean;
  profiles: Profiles;
}

const CreateFirstEventTypeView = ({ canAddEvents, profiles }: Props) => {
  const { t } = useLocale();

  return (
    <div className="md:py-20">
      <UserCalendarIllustration />
      <div className="block mx-auto text-center md:max-w-screen-sm">
        <h3 className="mt-2 text-xl font-bold text-neutral-900">{t("new_event_type_heading")}</h3>
        <p className="mt-1 mb-2 text-md text-neutral-600">{t("new_event_type_description")}</p>
        <CreateNewEventDialog canAddEvents={canAddEvents} profiles={profiles} />
      </div>
    </div>
  );
};

export default CreateFirstEventTypeView;
