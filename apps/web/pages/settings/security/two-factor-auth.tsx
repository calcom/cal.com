import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import TwoFactorAuthView from "~/settings/security/two-factor-auth-view";

TwoFactorAuthView.getLayout = getLayout;
TwoFactorAuthView.PageWrapper = PageWrapper;

export default TwoFactorAuthView;
