/// <reference types="react" />
import type { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
export default function ApiKeyDialogForm({ defaultValues, handleClose, }: {
    defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & {
        neverExpires?: boolean;
    };
    handleClose: () => void;
}): JSX.Element;
//# sourceMappingURL=ApiKeyDialogForm.d.ts.map