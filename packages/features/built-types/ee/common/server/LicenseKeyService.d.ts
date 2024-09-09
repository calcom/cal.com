export declare enum UsageEvent {
    BOOKING = "booking",
    USER = "user"
}
interface ILicenseKeyService {
    incrementUsage(usageEvent?: UsageEvent): Promise<any>;
    checkLicense(): Promise<boolean>;
}
declare class LicenseKeyService implements ILicenseKeyService {
    private readonly baseUrl;
    private readonly licenseKey;
    readonly CACHING_TIME = 86400000;
    private constructor();
    static create(): Promise<ILicenseKeyService>;
    private fetcher;
    incrementUsage(usageEvent?: UsageEvent): Promise<any>;
    checkLicense(): Promise<boolean>;
}
export declare class NoopLicenseKeyService implements ILicenseKeyService {
    incrementUsage(_usageEvent?: UsageEvent): Promise<any>;
    checkLicense(): Promise<boolean>;
}
export declare class LicenseKeySingleton {
    private static instance;
    private constructor();
    static getInstance(): Promise<ILicenseKeyService>;
}
export default LicenseKeyService;
//# sourceMappingURL=LicenseKeyService.d.ts.map