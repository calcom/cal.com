/// <reference types="react" />
export type UnpublishedEntityProps = {
    /**
     * If it is passed, don't pass orgSlug
     * It conveys two things - Slug for the team and that it is not an organization
     */
    teamSlug?: string | null;
    /**
     * If it is passed, don't pass teamSlug.
     * It conveys two things - Slug for the team and that it is an organization infact
     */
    orgSlug?: string | null;
    logoUrl?: string | null;
    /**
     * Team or Organization name
     */
    name?: string | null;
};
export declare function UnpublishedEntity(props: UnpublishedEntityProps): JSX.Element;
//# sourceMappingURL=UnpublishedEntity.d.ts.map