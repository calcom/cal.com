"use client";

import type { SettingsLayoutProps } from "./SettingsLayout";
import SettingsLayout, { ShellHeader } from "./SettingsLayout";

export default function SettingsLayoutAppDir(props: SettingsLayoutProps) {
  return <SettingsLayout {...props} />;
}

export { ShellHeader };

export const getLayout = (page: React.ReactElement) => <SettingsLayoutAppDir>{page}</SettingsLayoutAppDir>;
