import type { Dispatch, SetStateAction } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { MultiSelectCheckboxesOptionType as Option } from "@calcom/ui";
import type { FormValues } from "../pages/workflow";
type User = RouterOutputs["viewer"]["me"];
interface Props {
    form: UseFormReturn<FormValues>;
    workflowId: number;
    selectedOptions: Option[];
    setSelectedOptions: Dispatch<SetStateAction<Option[]>>;
    teamId?: number;
    user: User;
    readOnly: boolean;
    isOrg: boolean;
    allOptions: Option[];
}
export default function WorkflowDetailsPage(props: Props): JSX.Element;
export {};
//# sourceMappingURL=WorkflowDetailsPage.d.ts.map