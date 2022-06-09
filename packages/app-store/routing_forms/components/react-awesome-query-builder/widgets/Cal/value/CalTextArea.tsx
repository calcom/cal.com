const CalTextArea = (props) => {
  const { value, setValue, config, readonly, placeholder, maxLength, maxRows, fullWidth, customProps } =
    props;
  const onChange = (e) => {
    let val = e.target.value;
    if (val === "") val = undefined; // don't allow empty value
    setValue(val);
  };
  const textValue = value || "";
  return (
    <textarea
      value={textValue}
      placeholder={placeholder}
      disabled={readonly}
      onChange={onChange}
      maxLength={maxLength}
      style={{
        width: fullWidth ? "100%" : undefined,
      }}
      {...customProps}
    />
  );
};

export default CalTextArea;
