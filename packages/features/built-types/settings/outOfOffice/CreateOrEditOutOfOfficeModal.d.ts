/// <reference types="react" />
export type BookingRedirectForm = {
    dateRange: {
        startDate: Date;
        endDate: Date;
    };
    offset: number;
    toTeamUserId: number | null;
    reasonId: number;
    notes?: string;
    uuid?: string | null;
};
export declare const CreateOrEditOutOfOfficeEntryModal: ({ openModal, closeModal, currentlyEditingOutOfOfficeEntry, }: {
    openModal: boolean;
    closeModal: () => void;
    currentlyEditingOutOfOfficeEntry: BookingRedirectForm | null;
}) => JSX.Element;
//# sourceMappingURL=CreateOrEditOutOfOfficeModal.d.ts.map