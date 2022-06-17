import * as Radio from "@calcom/ui/form/radio-area/Radio";
import { RadioField } from "@calcom/ui/form/radio-area/Radio";

export default {
  title: "Radio",
  component: RadioField,
};

export const RadioGroupDemo = () => {
  return (
    <form>
      <Radio.Group aria-label="View density" defaultValue={"default"}>
        <RadioField label="Default" id="r1" value="1"></RadioField>
        <RadioField label="Next" id="r2" value="2"></RadioField>
        <RadioField label="Disabled" id="r3" disabled value="1"></RadioField>
      </Radio.Group>
    </form>
  );
};
