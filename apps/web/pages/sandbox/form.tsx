import React from "react";

import { Label, Input, TextField } from "@calcom/ui/form/fields";
import { Segment, SegmentOption } from "@calcom/ui/v2/core";

import { sandboxPage } from ".";

const page = sandboxPage(() => (
  <div className="space-y-6 p-4">
    <div>
      <Label>Label</Label>
    </div>
    <div>
      <Input name="test-01" placeholder="Input" />
    </div>
    <div>
      <TextField name="test-02" label="TextField" placeholder="it has an input baked in" />
      {/* Adding to sandbox cause storybook doesnt like radix tailwind :S  */}
      <div className="pt-4">
        <Segment label="Test" value="Test">
          <SegmentOption value="Test">One</SegmentOption>
          <SegmentOption value="2">Two</SegmentOption>
          <SegmentOption value="3">Three</SegmentOption>
          <SegmentOption value="4" disabled>
            Four
          </SegmentOption>
        </Segment>
      </div>
    </div>
  </div>
));

export default page.default;
export const getStaticProps = page.getStaticProps;
