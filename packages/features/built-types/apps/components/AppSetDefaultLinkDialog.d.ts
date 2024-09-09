import type { Dispatch, SetStateAction } from "react";
import type { EventLocationType } from "@calcom/app-store/locations";
export declare function AppSetDefaultLinkDialog({ locationType, setLocationType, onSuccess, }: {
    locationType: EventLocationType & {
        slug: string;
    };
    setLocationType: Dispatch<SetStateAction<(EventLocationType & {
        slug: string;
    }) | undefined>>;
    onSuccess: () => void;
}): JSX.Element;
//# sourceMappingURL=AppSetDefaultLinkDialog.d.ts.map