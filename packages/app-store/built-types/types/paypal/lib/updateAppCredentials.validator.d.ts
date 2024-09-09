import type { UpdateAppCredentialsOptions } from "@calcom/trpc/server/routers/viewer/apps/updateAppCredentials.handler";
declare const handlePaypalValidations: ({ input }: UpdateAppCredentialsOptions) => Promise<{
    client_id: string;
    secret_key: string;
    webhook_id: string | true;
}>;
export default handlePaypalValidations;
//# sourceMappingURL=updateAppCredentials.validator.d.ts.map