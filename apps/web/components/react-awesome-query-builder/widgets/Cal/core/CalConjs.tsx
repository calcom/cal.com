import * as RadioArea from "@components/ui/form/radio-area";

export default function CalConjs({
  id,
  not,
  setNot,
  conjunctionOptions,
  setConjunction,
  disabled,
  readonly,
  config,
  showNot,
  notLabel,
}) {
  const conjsCount = Object.keys(conjunctionOptions).length;
  const lessThenTwo = disabled;
  const { forceShowConj } = config.settings;
  const showConj = forceShowConj || (conjsCount > 1 && !lessThenTwo);

  const renderOptions = () => {
    return (
      <div className="flex items-center">
        {showNot && renderNot()}
        <RadioArea.Group
          onChange={onChange}
          className="relative mt-1 flex space-x-6 rounded-sm shadow-sm rtl:space-x-reverse">
          {Object.keys(conjunctionOptions).map((key) => {
            const { id, name, label, checked } = conjunctionOptions[key];
            const postfix = setConjunction.isDummyFn ? "__dummy" : "";
            if ((readonly || disabled) && !checked) return null;
            return (
              <RadioArea.Item
                key={id + postfix}
                type="radio"
                id={id + postfix}
                className="flex w-1/2 items-center border-0 p-0 text-sm"
                defaultChecked={true}
                name={name + postfix}
                checked={checked}
                disabled={readonly || disabled}
                value={key}>
                <strong className="block">{label}</strong>
              </RadioArea.Item>
            );
          })}
        </RadioArea.Group>
      </div>
    );
  };

  const renderNot = () => {
    const postfix = "not";
    return [
      <input
        key={id + postfix}
        type="checkbox"
        id={id + postfix}
        checked={not}
        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black ltr:mr-2 rtl:ml-2"
        disabled={readonly}
        onChange={onNotChange}
      />,
      <label key={id + postfix + "label"} htmlFor={id + postfix}>
        {notLabel || "NOT"}
      </label>,
    ];
  };

  const onChange = (value) => {
    setConjunction(value);
  };

  const onNotChange = (e) => setNot(e.target.checked);

  return [showConj && renderOptions()];
}
