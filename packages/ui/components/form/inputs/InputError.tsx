import { Icon } from "../../..";

type InputErrorProp = {
  message: string;
};

export const InputError = ({ message }: InputErrorProp) => (
  <div data-testid="field-error" className="text-gray mt-2 flex items-center gap-x-2 text-sm text-red-700">
    <div>
      <Icon name="info" className="h-3 w-3" />
    </div>
    <p>{message}</p>
  </div>
);
