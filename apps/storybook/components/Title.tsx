export const Title = ({
  title,
  suffix,
  subtitle,
  offset,
}: {
  title: string;
  suffix?: string;
  subtitle?: string;
  offset?: boolean;
}) => {
  return (
    <div className={`story-title ${offset && "offset"}`}>
      <h1>
        {title}
        {suffix && <span>{suffix}</span>}
      </h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
};
