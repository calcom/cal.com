import type { WorkflowStep } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import "react-phone-number-input/style.css";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { FormValues } from "../pages/workflow";
type User = RouterOutputs["viewer"]["me"];
type WorkflowStepProps = {
    step?: WorkflowStep;
    form: UseFormReturn<FormValues>;
    user: User;
    reload?: boolean;
    setReload?: Dispatch<SetStateAction<boolean>>;
    teamId?: number;
    readOnly: boolean;
};
export default function WorkflowStepContainer(props: WorkflowStepProps): JSX.Element;
export {};
//# sourceMappingURL=WorkflowStepContainer.d.ts.map