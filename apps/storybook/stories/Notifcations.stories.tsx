import { ComponentMeta } from "@storybook/react";
import { Toaster } from "react-hot-toast";

import { Button } from "@calcom/ui/v2";
import showToast from "@calcom/ui/v2/notfications";

export default {
  title: "Notifcations-Toasts",
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
} as ComponentMeta<typeof All>; // We have to fake this type as the story for this component isn't really a component.

export const All = () => (
  <div className="flex space-x-2">
    <Button onClick={() => showToast("This is a Neutral toast", "warning")}>Neutral</Button>
    <Button onClick={() => showToast("This is a Success toast", "success")}>Success</Button>
    <Button onClick={() => showToast("This is a Error toast", "error")}>Error</Button>
  </div>
);
