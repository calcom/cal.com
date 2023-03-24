import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";

const Spacer = () => <p style={{ height: 6 }} />;

export const Info = (props: {
  label: string;
  description: React.ReactNode | undefined | null;
  extraInfo?: React.ReactNode;
  withSpacer?: boolean;
  lineThrough?: boolean;
}) => {
  if (!props.description || props.description === "") return null;

  const descriptionCSS = "color: '#101010'; font-weight: 400; line-height: 24px; margin: 0;";

  const safeDescription = markdownToSafeHTML(props.description.toString()) || "";

  return (
    <>
      {props.withSpacer && <Spacer />}
      <div style={{ lineHeight: "6px" }}>
        <p style={{ color: "#101010" }}>{props.label}</p>
        <p
          style={{
            color: "#101010",
            fontWeight: 400,
            lineHeight: "24px",
            whiteSpace: "pre-wrap",
            textDecoration: props.lineThrough ? "line-through" : undefined,
          }}>
          {props.description}
        </p>
        {props.extraInfo}
      </div>
    </>
  );
};
