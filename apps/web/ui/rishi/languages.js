const UserLanguages = ({ data }) => {
  return (
    <div className="">
      <div className="mb-1 text-sm font-medium opacity-50">Languages I know</div>
      <div>
        {data?.length ? (
          <div>
            {data?.map((item, index) => (
              <span key={item + index}>
                <span key={item}>{item}</span>
                {index != data?.length - 1 ? <span>, </span> : ""}
              </span>
            ))}
          </div>
        ) : (
          "English, Hindi, German"
        )}
      </div>
    </div>
  );
};

export default UserLanguages;
