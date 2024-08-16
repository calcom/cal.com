import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";

import PageWrapper from "@components/PageWrapper";

import ApiKeysView from "~/settings/developer/api-keys-view";

ApiKeysView.getLayout = getLayout;
ApiKeysView.PageWrapper = PageWrapper;

export default ApiKeysView;
