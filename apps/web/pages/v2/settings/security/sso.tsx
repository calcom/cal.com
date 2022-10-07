import SAMLConfiguration from "@calcom/features/ee/sso/components/SAMLConfiguration";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const SAMLSSO = () => {
  return <SAMLConfiguration teamsView={false} teamId={null} />;
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
