// TODO: This file is currently unused.
import { Label } from "../form/inputs/Label";
import { Input } from "../form/inputs/TextField";

type Digit = {
  value: number;
  onChange: () => void;
};

type Translations = {
  labelText?: string;
};

type PropType = {
  digits: Digit[];
  digitClassName: string;
  translations?: Translations;
};

const TokenHandler = ({ digits, digitClassName, translations }: PropType) => {
  const { labelText = "Code" } = translations ?? {};

  return (
    <div>
      <Label htmlFor="code">{labelText}</Label>
      <div className="flex flex-row justify-between">
        {digits.map((element, index) => (
          <Input
            key={index}
            className={digitClassName}
            name={`2fa${index + 1}`}
            inputMode="decimal"
            {...element}
            autoFocus={index === 0}
            autoComplete="one-time-code"
          />
        ))}
      </div>
    </div>
  );
};

export default TokenHandler;
