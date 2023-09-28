const ThingsICanAdviseOn = ({ data }) => {
  const count = data?.length;
  if (!count) {
    return ``;
  }

  return (
    <div id="advice">
      <h3 className="mb-1 text-sm font-medium opacity-50">Things I can advice you on</h3>
      <div className="pl-5 text-lg text-gray-600">
        <ul className="list-disc space-y-1">
          {data?.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ThingsICanAdviseOn;
