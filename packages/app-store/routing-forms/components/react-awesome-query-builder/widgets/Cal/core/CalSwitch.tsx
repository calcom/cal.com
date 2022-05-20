const CalSwitch = ({ value, setValue, label, id, config, type }) => {
  const onChange = (e) => setValue(e.target.checked);
  const postfix = type;
  return [
    <input key={id + postfix} type="checkbox" id={id + postfix} checked={!!value} onChange={onChange} />,
    <label key={id + postfix + "label"} htmlFor={id + postfix}>
      {label}
    </label>,
  ];
};
export default CalSwitch;
