import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ProfileImpersonationViewWrapper from "~/settings/security/impersonation-view";

ProfileImpersonationViewWrapper.getLayout = getLayout;
ProfileImpersonationViewWrapper.PageWrapper = PageWrapper;

export default ProfileImpersonationViewWrapper;
