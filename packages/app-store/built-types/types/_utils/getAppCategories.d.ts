import type { AppCategories } from "@calcom/prisma/enums";
import type { IconName } from "@calcom/ui";
type AppCategoryEntry = {
    name: AppCategories;
    href: string;
    icon: IconName;
};
declare const getAppCategories: (baseURL: string, useQueryParam: boolean) => AppCategoryEntry[];
export default getAppCategories;
//# sourceMappingURL=getAppCategories.d.ts.map