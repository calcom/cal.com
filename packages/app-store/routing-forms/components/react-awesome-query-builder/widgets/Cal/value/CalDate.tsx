const VanillaDate = (props) => {
  const { value, setValue, config, valueFormat, readonly, customProps } = props;

  const onChange = (e) => {
    let value = e.target.value;
    if (value == "") value = undefined;
    setValue(value);
  };

  return <input type="date" value={value || ""} disabled={readonly} onChange={onChange} {...customProps} />;
};

export default VanillaDate;
