import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Tooltip } from "@calcom/ui";

interface UserProps {
  id: number;
  name: string | null;
  email: string;
}

const FirstAttendee = ({
  user,
  currentEmail,
}: {
  user: UserProps;
  currentEmail: string | null | undefined;
}) => {
  const { t } = useLocale();
  return user.email === currentEmail ? (
    <div className="inline-block">{t("you")}</div>
  ) : (
    <a
      key={user.email}
      className=" hover:text-blue-500"
      href={`mailto:${user.email}`}
      onClick={(e) => e.stopPropagation()}>
      {user.name}
    </a>
  );
};

type AttendeeProps = {
  name?: string;
  email: string;
};

const Attendee = ({ email, name }: AttendeeProps) => {
  return (
    <a className="hover:text-blue-500" href={`mailto:${email}`} onClick={(e) => e.stopPropagation()}>
      {name || email}
    </a>
  );
};

const DisplayAttendees = ({
  attendees,
  user,
  currentEmail,
}: {
  attendees: AttendeeProps[];
  user: UserProps | null;
  currentEmail?: string | null;
}) => {
  const { t } = useLocale();
  return (
    <div className="text-emphasis text-sm">
      {user && <FirstAttendee user={user} currentEmail={currentEmail} />}
      {attendees.length > 1 ? <span>,&nbsp;</span> : <span>&nbsp;{t("and")}&nbsp;</span>}
      <Attendee {...attendees[0]} />
      {attendees.length > 1 && (
        <>
          <div className="text-emphasis inline-block text-sm">&nbsp;{t("and")}&nbsp;</div>
          {attendees.length > 2 ? (
            <Tooltip
              content={attendees.slice(1).map((attendee) => (
                <p key={attendee.email}>
                  <Attendee {...attendee} />
                </p>
              ))}>
              <div className="inline-block">{t("plus_more", { count: attendees.length - 1 })}</div>
            </Tooltip>
          ) : (
            <Attendee {...attendees[1]} />
          )}
        </>
      )}
    </div>
  );
};

export default DisplayAttendees;
