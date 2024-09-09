import React from "react";
interface HeaderProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    CTA?: React.ReactNode;
    borderInShellHeader?: boolean;
    backButton?: boolean;
}
export default function Header({ children, title, description, CTA, borderInShellHeader, backButton, }: HeaderProps): JSX.Element;
export {};
//# sourceMappingURL=SettingsHeader.d.ts.map