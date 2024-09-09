import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import type { getServerSideProps } from "./getServerSideProps";
type Props = inferSSRProps<typeof getServerSideProps>;
export declare function getUrlSearchParamsToForward({ formResponse, fields, searchParams, }: {
    formResponse: Record<string, {
        value: number | string | string[];
    }>;
    fields: Pick<NonNullable<Props["form"]["fields"]>[number], "id" | "type" | "options" | "identifier" | "label">[];
    searchParams: URLSearchParams;
}): URLSearchParams;
export {};
//# sourceMappingURL=getUrlSearchParamsToForward.d.ts.map