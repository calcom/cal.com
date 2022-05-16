const CalValueSources = ({ config, valueSources, valueSrc, title, setValueSrc, readonly }) => {
  const renderOptions = (valueSources) =>
    valueSources.map(([srcKey, info]) => (
      <option key={srcKey} value={srcKey}>
        {info.label}
      </option>
    ));

  const onChange = (e) => setValueSrc(e.target.value);

  return (
    <select onChange={onChange} value={valueSrc} disabled={readonly}>
      {renderOptions(valueSources)}
    </select>
  );
};
export default CalValueSources;
