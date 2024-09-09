declare const dSyncUserSelect: {
    id: boolean;
    email: boolean;
    username: boolean;
    organizationId: boolean;
    completedOnboarding: boolean;
    identityProvider: boolean;
    profiles: boolean;
    locale: boolean;
    password: {
        select: {
            hash: boolean;
        };
    };
};
export default dSyncUserSelect;
//# sourceMappingURL=dSyncUserSelect.d.ts.map