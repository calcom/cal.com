import * as RadioArea from "@calcom/ui/form/radio-area";

export default {
  title: "Radio",
  component: RadioArea,
};

export const RadioDefault = () => (
  <RadioArea.Group className="flex max-w-screen-md space-x-4 rtl:space-x-reverse" name="radioGroup_1">
    <RadioArea.Item value="radioGroup_1_radio_1" className="flex-grow bg-white">
      <strong className="mb-1">radioGroup_1_radio_1</strong>
      <p>Description #1</p>
    </RadioArea.Item>
    <RadioArea.Item value="radioGroup_1_radio_2" className="flex-grow bg-white">
      <strong className="mb-1">radioGroup_1_radio_2</strong>
      <p>Description #2</p>
    </RadioArea.Item>
    <RadioArea.Item value="radioGroup_1_radio_3" className="flex-grow bg-white">
      <strong className="mb-1">radioGroup_1_radio_3</strong>
      <p>Description #3</p>
    </RadioArea.Item>
  </RadioArea.Group>
);
