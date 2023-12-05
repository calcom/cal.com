// This is a Next.js Page (/settings/platform/oauth-clients/create)
// Here we will import the oAuthClientForm component
// we will call usePersistOAuthClient to get the logic to save the client
import React from "react";

import OAuthForm from "./components/OAuthClientForm";

export const CreateOAuthClient = () => {
  // get logic from usePersistOAuthClient (only create)
  // const {save} = usePeristOAuthClient()
  // pass props to OAuthClientForm (handleSubmit)
  const handleSubmit = (formData: unknown) => {
    //transform data
    // call save from the hook
  };

  return (
    <div>
      <OAuthForm onSubmit={handleSubmit} />
    </div>
  );
};

CreateOAuthClient.getLayout = getLayout;
CreateOAuthClient.PageWrapper = PageWrapper;

export default CreateOAuthClient;
