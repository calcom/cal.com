/// <reference types="react" />
import type { Team } from "@prisma/client";
import type { z } from "zod";
import type { orgSettingsSchema } from "@calcom/prisma/zod-utils";
type FormValues = {
    name: Team["name"];
    slug: Team["slug"];
    organizationSettings: z.infer<typeof orgSettingsSchema>;
};
export declare const OrgForm: ({ org, }: {
    org: FormValues & {
        id: Team["id"];
    };
}) => JSX.Element;
export default OrgForm;
//# sourceMappingURL=AdminOrgEditPage.d.ts.map