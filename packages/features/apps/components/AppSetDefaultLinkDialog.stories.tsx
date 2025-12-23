import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";

import type { EventLocationType } from "@calcom/app-store/locations";

import { AppSetDefaultLinkDialog } from "./AppSetDefaultLinkDialog";
import type { UpdateUsersDefaultConferencingAppParams } from "./AppSetDefaultLinkDialog";

const meta = {
  component: AppSetDefaultLinkDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AppSetDefaultLinkDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock location type for Zoom
const mockZoomLocationType: EventLocationType & { slug: string } = {
  default: false,
  type: "integrations:zoom",
  label: "Zoom Video",
  organizerInputType: "text",
  organizerInputPlaceholder: "https://zoom.us/j/1234567890",
  variable: "locationLink",
  defaultValueVariable: "link",
  iconUrl: "/api/app-store/zoomvideo/icon.svg",
  slug: "zoom",
  urlRegExp: "^https:\\/\\/(.*)\\.?zoom\\.us\\/.*",
  category: "conferencing",
  linkType: "dynamic",
  messageForOrganizer: "Use Zoom for this meeting",
};

// Mock location type for Google Meet
const mockGoogleMeetLocationType: EventLocationType & { slug: string } = {
  default: false,
  type: "integrations:google:meet",
  label: "Google Meet",
  organizerInputType: "text",
  organizerInputPlaceholder: "https://meet.google.com/abc-defg-hij",
  variable: "locationLink",
  defaultValueVariable: "link",
  iconUrl: "/api/app-store/googlevideo/icon.svg",
  slug: "google-meet",
  urlRegExp: "^https:\\/\\/meet\\.google\\.com\\/.*",
  category: "conferencing",
  linkType: "dynamic",
  messageForOrganizer: "Use Google Meet for this meeting",
};

// Mock location type for Microsoft Teams
const mockTeamsLocationType: EventLocationType & { slug: string } = {
  default: false,
  type: "integrations:msteams",
  label: "Microsoft Teams",
  organizerInputType: "text",
  organizerInputPlaceholder: "https://teams.microsoft.com/l/meetup-join/...",
  variable: "locationLink",
  defaultValueVariable: "link",
  iconUrl: "/api/app-store/office365video/icon.svg",
  slug: "msteams",
  urlRegExp: "^https:\\/\\/teams\\.microsoft\\.com\\/.*",
  category: "conferencing",
  linkType: "dynamic",
  messageForOrganizer: "Use Microsoft Teams for this meeting",
};

// Mock location type for a custom video link
const mockCustomVideoLocationType: EventLocationType & { slug: string } = {
  default: true,
  type: "link",
  label: "Video Link",
  organizerInputType: "text",
  organizerInputPlaceholder: "https://example.com/meeting",
  variable: "locationLink",
  defaultValueVariable: "link",
  iconUrl: "/link.svg",
  slug: "link",
  urlRegExp: "^https?:\\/\\/.*",
  category: "conferencing",
  linkType: "static",
  messageForOrganizer: "Use custom video link for this meeting",
};

export const Default: Story = {
  render: function DefaultStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >(mockZoomLocationType);

    return (
      <div>
        <button
          onClick={() => setLocationType(mockZoomLocationType)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Open Dialog
        </button>
        {locationType && (
          <AppSetDefaultLinkDialog
            locationType={locationType}
            setLocationType={setLocationType}
            onSuccess={fn()}
            handleUpdateUserDefaultConferencingApp={fn()}
          />
        )}
      </div>
    );
  },
};

export const ZoomDialog: Story = {
  render: function ZoomStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >(mockZoomLocationType);

    const handleUpdate = (params: UpdateUsersDefaultConferencingAppParams) => {
      console.log("Updating Zoom link:", params);
      params.onSuccessCallback();
    };

    return (
      <div>
        <button
          onClick={() => setLocationType(mockZoomLocationType)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Set Zoom Link
        </button>
        {locationType && (
          <AppSetDefaultLinkDialog
            locationType={locationType}
            setLocationType={setLocationType}
            onSuccess={() => console.log("Success!")}
            handleUpdateUserDefaultConferencingApp={handleUpdate}
          />
        )}
      </div>
    );
  },
};

export const GoogleMeetDialog: Story = {
  render: function GoogleMeetStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >(mockGoogleMeetLocationType);

    const handleUpdate = (params: UpdateUsersDefaultConferencingAppParams) => {
      console.log("Updating Google Meet link:", params);
      params.onSuccessCallback();
    };

    return (
      <div>
        <button
          onClick={() => setLocationType(mockGoogleMeetLocationType)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Set Google Meet Link
        </button>
        {locationType && (
          <AppSetDefaultLinkDialog
            locationType={locationType}
            setLocationType={setLocationType}
            onSuccess={() => console.log("Success!")}
            handleUpdateUserDefaultConferencingApp={handleUpdate}
          />
        )}
      </div>
    );
  },
};

export const MicrosoftTeamsDialog: Story = {
  render: function TeamsStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >(mockTeamsLocationType);

    const handleUpdate = (params: UpdateUsersDefaultConferencingAppParams) => {
      console.log("Updating Microsoft Teams link:", params);
      params.onSuccessCallback();
    };

    return (
      <div>
        <button
          onClick={() => setLocationType(mockTeamsLocationType)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Set Microsoft Teams Link
        </button>
        {locationType && (
          <AppSetDefaultLinkDialog
            locationType={locationType}
            setLocationType={setLocationType}
            onSuccess={() => console.log("Success!")}
            handleUpdateUserDefaultConferencingApp={handleUpdate}
          />
        )}
      </div>
    );
  },
};

export const CustomVideoLinkDialog: Story = {
  render: function CustomVideoStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >(mockCustomVideoLocationType);

    const handleUpdate = (params: UpdateUsersDefaultConferencingAppParams) => {
      console.log("Updating custom video link:", params);
      params.onSuccessCallback();
    };

    return (
      <div>
        <button
          onClick={() => setLocationType(mockCustomVideoLocationType)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Set Custom Video Link
        </button>
        {locationType && (
          <AppSetDefaultLinkDialog
            locationType={locationType}
            setLocationType={setLocationType}
            onSuccess={() => console.log("Success!")}
            handleUpdateUserDefaultConferencingApp={handleUpdate}
          />
        )}
      </div>
    );
  },
};

export const WithErrorHandling: Story = {
  render: function ErrorStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >(mockZoomLocationType);

    const handleUpdate = (params: UpdateUsersDefaultConferencingAppParams) => {
      console.log("Simulating error for link:", params.appLink);
      // Simulate error callback
      params.onErrorCallback();
    };

    return (
      <div>
        <button
          onClick={() => setLocationType(mockZoomLocationType)}
          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700">
          Open Dialog (Error Scenario)
        </button>
        {locationType && (
          <AppSetDefaultLinkDialog
            locationType={locationType}
            setLocationType={setLocationType}
            onSuccess={() => console.log("Success!")}
            handleUpdateUserDefaultConferencingApp={handleUpdate}
          />
        )}
      </div>
    );
  },
};

export const AlreadyOpen: Story = {
  render: function AlreadyOpenStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >(mockZoomLocationType);

    const handleUpdate = (params: UpdateUsersDefaultConferencingAppParams) => {
      console.log("Updating link:", params);
      setTimeout(() => {
        params.onSuccessCallback();
      }, 1000);
    };

    return (
      <AppSetDefaultLinkDialog
        locationType={locationType}
        setLocationType={setLocationType}
        onSuccess={() => console.log("Success!")}
        handleUpdateUserDefaultConferencingApp={handleUpdate}
      />
    );
  },
};

export const MultipleApps: Story = {
  render: function MultipleAppsStory() {
    const [locationType, setLocationType] = useState<
      (EventLocationType & { slug: string }) | undefined
    >();

    const handleUpdate = (params: UpdateUsersDefaultConferencingAppParams) => {
      console.log("Updating link:", params);
      params.onSuccessCallback();
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setLocationType(mockZoomLocationType)}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Zoom
          </button>
          <button
            onClick={() => setLocationType(mockGoogleMeetLocationType)}
            className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700">
            Google Meet
          </button>
          <button
            onClick={() => setLocationType(mockTeamsLocationType)}
            className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
            Teams
          </button>
          <button
            onClick={() => setLocationType(mockCustomVideoLocationType)}
            className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700">
            Custom
          </button>
        </div>
        {locationType && (
          <AppSetDefaultLinkDialog
            locationType={locationType}
            setLocationType={setLocationType}
            onSuccess={() => console.log("Success!")}
            handleUpdateUserDefaultConferencingApp={handleUpdate}
          />
        )}
      </div>
    );
  },
};
