/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
interface CreateANewTeamFormProps {
    onCancel: () => void;
    submitLabel: string;
    onSuccess: (data: RouterOutputs["viewer"]["teams"]["create"]) => void;
    inDialog?: boolean;
    slug?: string;
}
export declare const CreateANewTeamForm: (props: CreateANewTeamFormProps) => JSX.Element;
export {};
//# sourceMappingURL=CreateANewTeamForm.d.ts.map