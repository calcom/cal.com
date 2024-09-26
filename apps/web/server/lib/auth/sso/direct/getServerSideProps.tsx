import { samlProductID, samlTenantID } from "@calcom/features/ee/sso/lib/saml";

export async function getServerSideProps() {
  return {
    props: {
      samlTenantID,
      samlProductID,
    },
  };
}
