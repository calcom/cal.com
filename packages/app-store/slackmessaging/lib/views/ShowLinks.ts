import dayjs from "@calcom/dayjs";
import { Blocks, Elements, Message } from "slack-block-builder";

import { WEBAPP_URL } from "@calcom/lib/constants";

interface IEventTypes {
  slug: string;
  title: string;
}

const ShowLinks = (eventLinks: IEventTypes[] | undefined, username: string) => {
  if (eventLinks?.length === 0 || !eventLinks) {
    return Message()
      .blocks(Blocks.Section({ text: "You do not have any links." }))
      .asUser()
      .buildToJSON();
  }
  return Message()
    .blocks(
      Blocks.Section({ text: `${username}'s Cal.com Links` }),
      Blocks.Divider(),
      eventLinks.map((links) =>
        Blocks.Section({
          text: `${links.title} | ${WEBAPP_URL}/${username}/${links.slug}`,
        }).accessory(Elements.Button({ text: "Open", url: `${WEBAPP_URL}/${username}/${links.slug}` }))
      )
    )
    .buildToJSON();
};

export default ShowLinks;
