import type { AppCategories } from "@calcom/prisma/enums";
/**
 * Handles if the app category should be full capitalized ex. CRM
 *
 * @param {App["variant"]} variant - The variant of the app.
 * @param {boolean} [returnLowerCase] - Optional flag to return the title in lowercase.
 */
declare const getAppCategoryTitle: (variant: AppCategories, returnLowerCase?: boolean) => string;
export default getAppCategoryTitle;
//# sourceMappingURL=getAppCategoryTitle.d.ts.map