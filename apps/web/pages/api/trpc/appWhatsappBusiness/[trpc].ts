import appWhatsappBusiness from "@calcom/app-store/whatsapp-business/trpc-router";
import { createNextApiHandler } from "@calcom/trpc/server/createNextApiHandler";

export default createNextApiHandler(appWhatsappBusiness);



