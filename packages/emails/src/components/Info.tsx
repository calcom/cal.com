import { markdownAndSanitize } from "@calcom/lib/markdownAndSanitize";

const Spacer = () => <p style={{ height: 6 }} />;

export const Info = (props: {
  label: string;
  description: React.ReactNode | undefined | null;
  extraInfo?: React.ReactNode;
  withSpacer?: boolean;
  lineThrough?: boolean;
  formatted?: boolean;
}) => {
  if (!props.description || props.description === "") return null;

  const descriptionCSS = "color: '#101010'; font-weight: 400; line-height: 24px; margin: 0;";

  const safeDescription = markdownAndSanitize(props.description.toString()) || "";

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
          {props.formatted ? (
            <p
              className="dark:text-darkgray-600 mt-2 text-sm text-gray-500 [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
              dangerouslySetInnerHTML={{
                __html: safeDescription
                  .replaceAll("<p>", `<p style="${descriptionCSS}">`)
                  .replaceAll("<li>", `<li style="${descriptionCSS}">`),
              }}
            />
          ) : (
            props.description
          )}
        </p>
        {props.extraInfo}
      </div>
    </>
  );
};
