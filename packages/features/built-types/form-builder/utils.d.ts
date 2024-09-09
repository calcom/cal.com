export declare const preprocessNameFieldDataWithVariant: (variantName: "fullName" | "firstAndLastName", value: string | Record<"firstName" | "lastName", string> | undefined) => string | Record<"firstName" | "lastName", string>;
export declare const getFullName: (name: string | {
    firstName: string;
    lastName?: string;
} | undefined) => string;
//# sourceMappingURL=utils.d.ts.map