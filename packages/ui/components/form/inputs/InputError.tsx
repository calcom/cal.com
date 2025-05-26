import { Icon } from "../../icon";

type InputErrorProp = {
  message: string;
};

export const InputError = ({ message }: InputErrorProp) => (
  <div data-testid="field-error" className="text-error mt-2 flex items-center gap-x-2 text-sm">
    <div>
      <Icon name="info" className="h-3 w-3" />
    </div>
    <p>{message}</p>
  </div>
);
