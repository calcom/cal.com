import type { ReactNode } from "react";
type MetaType = {
    title: string;
    description: string;
    backButton?: boolean;
    CTA?: ReactNode;
    borderInShellHeader?: boolean;
};
export declare function useMeta(): {
    meta: MetaType;
    setMeta: (_newMeta: Partial<MetaType>) => void;
};
export declare function MetaProvider({ children }: {
    children: ReactNode;
}): JSX.Element;
/**
 * The purpose of this component is to simplify title and description handling.
 * Similarly to `next/head`'s `Head` component this allow us to update the metadata for a page
 * from any children, also exposes the metadata via the `useMeta` hook in case we need them
 * elsewhere (ie. on a Heading, Title, Subtitle, etc.)
 * @example <Meta title="Password" description="Manage settings for your account passwords" />
 */
export default function Meta({ title, description, backButton, CTA, borderInShellHeader }: MetaType): JSX.Element;
export {};
//# sourceMappingURL=Meta.d.ts.map