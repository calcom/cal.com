import React from "react";

import { Label, Input, TextField } from "@components/form/fields";

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
    </div>
  </div>
));

export default page.default;
export const getStaticProps = page.getStaticProps;
