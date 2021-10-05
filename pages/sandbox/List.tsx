import React from "react";

import { List, ListItem } from "@components/List";

import { sandboxPage } from ".";

const page = sandboxPage(() => (
  <div className="p-4">
    Unstyled
    <List>
      <ListItem>An item</ListItem>
      <ListItem href="#">A link</ListItem>
      <ListItem>An item</ListItem>
      <ListItem>An item</ListItem>
      <ListItem href="#">A link</ListItem>
    </List>
    Spaced
    <List className="space-y-8">
      <ListItem className="p-4">Hello</ListItem>
      <ListItem className="p-4">Hello</ListItem>
    </List>
  </div>
));

export default page.default;
export const getStaticProps = page.getStaticProps;
