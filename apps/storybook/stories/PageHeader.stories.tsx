import { ComponentMeta } from "@storybook/react";
import { Search } from "react-feather";

import { Button, TextField } from "@calcom/ui/v2";
import PageHeader from "@calcom/ui/v2/core/PageHeader";

export default {
  title: "pattern/Page Header",
  component: PageHeader,
  decorators: [
    (Story) => (
      <div className="">
        <Story />
      </div>
    ),
  ],
} as ComponentMeta<typeof PageHeader>;

export const Default = () => (
  <PageHeader title="Title" description="Some description about the header above" />
);

export const ButtonRight = () => (
  <PageHeader
    title="Title"
    description="Some description about the header above"
    rightAlignedComponent={<Button>Button Text</Button>}
  />
);
export const ComingSoon = () => (
  <PageHeader
    title="Title"
    description="Some description about the header above"
    badgeText="Coming Soon"
    badgeVariant="gray"
  />
);
export const SearchInstalledApps = () => (
  <PageHeader
    title="Search booking"
    description="See upcoming and past events booking through your event type link"
    rightAlignedComponent={
      <TextField
        containerClassName="h-9 max-h-9"
        addOnLeading={<Search />}
        name="search"
        labelSrOnly
        placeholder="WIP"
      />
    }
  />
);
