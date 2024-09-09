import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";
import { Dialog, DialogContent, DialogFooter, DialogClose, DialogHeader } from "./Dialog";
type StoryArgs = ComponentProps<typeof Dialog> & ComponentProps<typeof DialogContent> & ComponentProps<typeof DialogHeader> & ComponentProps<typeof DialogFooter> & ComponentProps<typeof DialogClose> & {
    onClick: (...args: unknown[]) => void;
};
declare const meta: Meta<StoryArgs>;
export default meta;
type Story = StoryObj<StoryArgs>;
export declare const Default: Story;
//# sourceMappingURL=Dialog.stories.d.ts.map