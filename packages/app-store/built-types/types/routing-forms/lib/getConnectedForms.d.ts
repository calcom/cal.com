import type { App_RoutingForms_Form } from "@calcom/prisma/client";
export default function getConnectedForms(prisma: typeof import("@calcom/prisma").default, form: Pick<App_RoutingForms_Form, "id" | "userId">): Promise<{
    id: string;
    name: string;
    description: string | null;
    routes: import(".prisma/client").Prisma.JsonValue;
    fields: import(".prisma/client").Prisma.JsonValue;
    position: number;
    disabled: boolean;
    userId: number;
    createdAt: Date;
    updatedAt: Date;
    teamId: number | null;
    settings: import(".prisma/client").Prisma.JsonValue;
}[]>;
//# sourceMappingURL=getConnectedForms.d.ts.map