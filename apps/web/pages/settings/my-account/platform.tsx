import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { Meta } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

const PlatformViewWrapper = () => {
  // logo can be optional
  const oauthClientsData = [
    {
      name: "Cal",
      redirect_uris: [
        "https://www.youtube.com/results?search_query=oauth+explained",
        "https://ui.shadcn.com/docs/components/button#installation",
        "https://app.cal.com/event-types",
      ],
    },
  ];

  return (
    <div>
      <Meta
        title="OAuth clients"
        description="This is where you have all the info about your OAuth clients"
        borderInShellHeader={false}
      />
      <div className="border-subtle mt-6 flex items-center rounded-lg border p-6 text-sm">
        <div>
          <h1>This is where the OAuth clients list will appear</h1>
          <p className="text-default">Theme page</p>
        </div>
      </div>
      <div className="border-subtle mt-6 flex items-center rounded-lg border p-6 text-sm">
        <div>
          <h1>This is where the link to create a new OAuth client will be present</h1>
          <p className="text-default">Theme page</p>
        </div>
      </div>
    </div>
  );
};

PlatformViewWrapper.getLayout = getLayout;
PlatformViewWrapper.PageWrapper = PageWrapper;

export default PlatformViewWrapper;
