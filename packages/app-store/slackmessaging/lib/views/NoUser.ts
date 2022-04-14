import { Message, Blocks, Elements } from "slack-block-builder";

import { BASE_URL } from "@calcom/lib/constants";

const NoUserMessage = () => {
  return Message()
    .blocks(
      Blocks.Section({ text: "This slack account is not linked with a cal.com account" }),
      Blocks.Actions().elements(
        Elements.Button({ text: "Cancel", actionId: "cancel" }).danger(),
        Elements.Button({
          text: "Connect",
          actionId: "open.connect.link",
          url: `${BASE_URL}/apps/installed`,
        }).primary()
      )
    )
    .buildToJSON();
};
export default NoUserMessage;
