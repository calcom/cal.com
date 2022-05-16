// import VanillaSlider from "react-awesome-query-builder/modules/components/widgets/vanilla/value/VanillaSlider";
import { Input } from "@calcom/ui/form/fields";

export default function CalSlider({ min, max, value, setValue }) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      value={value}></Input>
  );
}
