import { useState } from "react";

import * as Radio from "@calcom/ui/form/radio-area/Radio";

export default {
  title: "Radio",
  component: Radio,
};

export const RadioGroupDemo = () => {
  return (
    <form>
      <Radio.Group aria-label="View density" defaultValue={"default"}>
        <div className="flex items-center">
          <Radio.Radio value="default" id="r1">
            <Radio.Indicator />
          </Radio.Radio>
          <Radio.Label htmlFor="r1">Radio Example</Radio.Label>
        </div>
        <div className="flex items-center">
          <Radio.Radio value="test" id="r1">
            <Radio.Indicator />
          </Radio.Radio>
          <Radio.Label htmlFor="r1">Radio Example</Radio.Label>
        </div>
        <div className="flex items-center">
          <Radio.Radio value="test2" id="r1">
            <Radio.Indicator />
          </Radio.Radio>
          <Radio.Label htmlFor="r1">Radio Example</Radio.Label>
        </div>
      </Radio.Group>
    </form>
  );
};
