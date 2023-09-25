"use client";

import * as RadixPopover from "@radix-ui/react-popover";

const Popover = ({ trigger, content }) => (
  <RadixPopover.Root>
    <RadixPopover.Trigger>{trigger ?? ""}</RadixPopover.Trigger>
    <RadixPopover.Anchor />
    <RadixPopover.Portal>
      <RadixPopover.Content>
        <div>{content ?? ""}</div>
        <RadixPopover.Close />
        <RadixPopover.Arrow />
      </RadixPopover.Content>
    </RadixPopover.Portal>
  </RadixPopover.Root>
);

export default Popover;
