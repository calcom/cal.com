import type Zod from "zod";
import type z from "zod";
export declare function getParsedAppKeysFromSlug<T extends Zod.Schema>(slug: string, schema: T): Promise<z.infer<T>>;
export default getParsedAppKeysFromSlug;
//# sourceMappingURL=getParsedAppKeysFromSlug.d.ts.map