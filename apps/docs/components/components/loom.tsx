export default ({
  src,
  title,
  height = 500,
}: {
  src: string;
  title?: string;
  height?: number;
}) => {
  // If a regular YouTube URL is provided, transform to the appropriate
  // embed URL.
  let loomSrc = src;
  const loomId = loomSrc.match(
    /^https?:\/\/(www.)?loom.com\/embed\/([a-zA-Z0-9]+)/
  )?.[2];

  if (loomId) {
    loomSrc = "https://www.loom.com/embed/" + loomId;
  }

  return (
    <div
      className="relative rounded-md overflow-hidden w-full pb-[55%] h-0"
      style={{ height: 0 }}
    >
      <iframe
        title={title}
        className="absolute top-0 left-0 w-full h-full"
        src={loomSrc}
        scrolling="no"
        // @ts-ignore
        webkitallowfullscreen
        mozallowfullscreen
        allowfullscreen
      ></iframe>
    </div>
  );
};

