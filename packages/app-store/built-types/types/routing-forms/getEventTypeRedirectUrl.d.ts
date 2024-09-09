/**
 * Handles the following cases
 * 1. A team form where the team isn't a sub-team
 *    1.1 A team form where team isn't a sub-team and the user is migrated. i.e. User has been migrated but not the team
 *    1.2 A team form where team isn't a sub-team and the user is not migrated i.e. Both user and team are not migrated
 * 2. A team form where the team is a sub-team
 *    1.1 A team form where the team is a sub-team and the user is migrated i.e. Both user and team are migrated
 *    1.2 A team form where the team is a sub-team and the user is not migrated i.e. Team has been migrated but not the user
 * 3. A user form where the user is migrated
 *    3.1 A user form where the user is migrated and the team is migrated i.e. Both user and team are migrated
 *    3.2 A user form where the user is migrated and the team is not migrated i.e. User has been migrated but not the team
 * 4. A user form where the user is not migrated
 *    4.1 A user form where the user is not migrated and the team is migrated i.e. Team has been migrated but not the user
 *    4.2 A user form where the user is not migrated and the team is not migrated i.e. Both user and team are not migrated
 */
export declare function getAbsoluteEventTypeRedirectUrl({ eventTypeRedirectUrl, form, allURLSearchParams, }: {
    eventTypeRedirectUrl: string;
    form: {
        team: {
            parentId: number | null;
        } | null;
        /**
         * Set only if user is migrated
         */
        nonOrgUsername: string | null;
        /**
         * Set only if team is migrated
         */
        nonOrgTeamslug: string | null;
        /**
         * The origin for the user
         */
        userOrigin: string;
        /**
         * The origin for the team the form belongs to
         */
        teamOrigin: string;
    };
    allURLSearchParams: URLSearchParams;
}): string;
//# sourceMappingURL=getEventTypeRedirectUrl.d.ts.map