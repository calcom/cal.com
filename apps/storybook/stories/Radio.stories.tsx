import * as Radio from "@calcom/ui/v2/form/radio-area/Radio";
import { RadioField } from "@calcom/ui/v2/form/radio-area/Radio";

export default {
  title: "Radio",
  component: RadioField,
};

export const RadioGroupDemo = () => {
  return (
    <form>
      <Radio.Group aria-label="View density" defaultValue="default">
        <RadioField label="Default" id="r1" value="1" />
        <RadioField label="Next" id="r2" value="2" />
        <RadioField label="Disabled" id="r3" disabled value="1" />
      </Radio.Group>
    </form>
  );
};
