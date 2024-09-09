/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
export type TApiKeys = RouterOutputs["viewer"]["apiKeys"]["list"][number];
declare const ApiKeyListItem: ({ apiKey, lastItem, onEditClick, }: {
    apiKey: TApiKeys;
    lastItem: boolean;
    onEditClick: () => void;
}) => JSX.Element;
export default ApiKeyListItem;
//# sourceMappingURL=ApiKeyListItem.d.ts.map