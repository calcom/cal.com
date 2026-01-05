import { useLocale } from "@calcom/lib/hooks/useLocale";

export type MembersMatchResultType = {
  isUsingAttributeWeights: boolean;
  eventTypeRedirectUrl: string | null;
  contactOwnerEmail: string | null;
  teamMembersMatchingAttributeLogic: { id: number; name: string | null; email: string }[] | null;
  perUserData: {
    bookingsCount: Record<number, number>;
    bookingShortfalls: Record<number, number> | null;
    calibrations: Record<number, number> | null;
    weights: Record<number, number> | null;
  } | null;
  checkedFallback: boolean;
  mainWarnings: string[] | null;
  fallbackWarnings: string[] | null;
} | null;

export const TeamMembersMatchResult = ({
  membersMatchResult,
}: {
  membersMatchResult: MembersMatchResultType;
}) => {
  const { t } = useLocale();
  if (!membersMatchResult) return null;

  const renderQueue = () => {
    if (isNoLogicFound(membersMatchResult.teamMembersMatchingAttributeLogic)) {
      return <div className="mt-4">{t("no_active_queues")}</div>;
    }

    const matchingMembers = membersMatchResult.teamMembersMatchingAttributeLogic;

    if (matchingMembers.length && membersMatchResult.perUserData) {
      const perUserData = membersMatchResult.perUserData;
      return (
        <span className="font-semibold">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">{t("email")}</th>
                  <th className="py-2 pr-4">{t("bookings")}</th>
                  {membersMatchResult.perUserData.weights ? <th className="py-2">{t("weight")}</th> : null}
                  {membersMatchResult.perUserData.calibrations ? (
                    <th className="py-2">{t("calibration")}</th>
                  ) : null}
                  {membersMatchResult.perUserData.bookingShortfalls ? (
                    <th className="border-l py-2 pl-2">{t("shortfall")}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {matchingMembers.map((member, index) => (
                  <tr key={member.id} className="border-b">
                    <td className="py-2 pr-4">{index + 1}</td>
                    <td className="py-2 pr-4">{member.email}</td>
                    <td className="py-2">{perUserData.bookingsCount[member.id] ?? 0}</td>
                    {perUserData.weights ? (
                      <td className="py-2">{perUserData.weights[member.id] ?? 0}</td>
                    ) : null}
                    {perUserData.calibrations ? (
                      <td className="py-2">{perUserData.calibrations[member.id] ?? 0}</td>
                    ) : null}
                    {perUserData.bookingShortfalls ? (
                      <td className="border-l py-2 pl-2">{perUserData.bookingShortfalls[member.id] ?? 0}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </span>
      );
    }

    return (
      <span className="font-semibold">
        {t("all_assigned_members_of_the_team_event_type_consider_tweaking_fallback_to_have_a_match")}
      </span>
    );
  };

  return (
    <div className="text-default mt-2 stack-y-2">
      <div className="mt-4">
        {membersMatchResult.contactOwnerEmail ? (
          <div data-testid="contact-owner-email">
            {t("contact_owner")}:{" "}
            <span className="font-semibold">{membersMatchResult.contactOwnerEmail}</span>
          </div>
        ) : (
          <></>
        )}
        <div className="mt-2" data-testid="matching-members">
          {renderQueue()}
        </div>
      </div>
    </div>
  );

  function isNoLogicFound(
    teamMembersMatchingAttributeLogic: NonNullable<MembersMatchResultType>["teamMembersMatchingAttributeLogic"]
  ): teamMembersMatchingAttributeLogic is null {
    return teamMembersMatchingAttributeLogic === null;
  }
};
