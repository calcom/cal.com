import React from "react";

import { Label, Input, TextField } from "@components/form/fields";

import { sandboxPage } from ".";

const page = sandboxPage(() => (
  <div className="p-4 space-y-6">
    <div>
      <Label>Label</Label>
    </div>
    <div>
      <Input placeholder="Input" />
    </div>
    <div>
      <TextField label="TextField" placeholder="it has an input baked in" />
    </div>
  </div>
));

export default page.default;
export const getStaticProps = page.getStaticProps;
