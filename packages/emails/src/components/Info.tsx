const Spacer = () => <p style={{ height: 6 }} />;

export const Info = (props: {
  label: string;
  description: React.ReactNode | undefined | null;
  extraInfo?: React.ReactNode;
  withSpacer?: boolean;
}) => {
  if (!props.description) return null;
  return (
    <>
      {props.withSpacer && <Spacer />}
      <div style={{ lineHeight: "6px" }}>
        <p style={{ color: "#494949" }}>{props.label}</p>
        <p style={{ color: "#494949", fontWeight: 400, lineHeight: "24px", whiteSpace: "pre-wrap" }}>
          {props.description}
        </p>
        {props.extraInfo}
      </div>
    </>
  );
};
