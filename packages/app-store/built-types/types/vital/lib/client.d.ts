import { VitalClient } from "@tryvital/vital-node";
import type { ClientConfig } from "@tryvital/vital-node/dist/lib/models";
type VitalEnv = ClientConfig & {
    mode: string;
    webhook_secret: string;
};
export declare let vitalClient: VitalClient | null;
export declare let vitalEnv: VitalEnv | null;
export declare function initVitalClient(): Promise<VitalClient>;
export default vitalClient;
//# sourceMappingURL=client.d.ts.map