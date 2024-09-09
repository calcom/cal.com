import type { Page } from "@playwright/test";
export declare function addForm(page: Page, { name }?: {
    name?: string | undefined;
}): Promise<string>;
export declare function addOneFieldAndDescriptionAndSaveForm(formId: string, page: Page, form: {
    description?: string;
    field?: {
        typeIndex: number;
        label: string;
    };
}): Promise<{
    types: string[];
}>;
export declare function saveCurrentForm(page: Page): Promise<void>;
export declare function verifySelectOptions(selector: {
    selector: string;
    nth: number;
}, expectedOptions: string[], page: Page): Promise<{
    optionsInUi: string[];
}>;
//# sourceMappingURL=testUtils.d.ts.map