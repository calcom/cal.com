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
  let embedUrl = src;
  const watchId = src.match(
    /^https?:\/\/(www.)?youtube.com\/watch\?v=([a-zA-Z0-9_.-]+)/
  )?.[2];
  if (watchId) {
    embedUrl = "https://www.youtube.com/embed/" + watchId;
  }

  return (
    <div
      className="relative rounded-md overflow-hidden w-full pb-[55%] h-0"
      style={{ height: 0 }}
    >
      <iframe
        title={title}
        className="absolute top-0 left-0 w-full h-full"
        src={embedUrl}
        scrolling="no"
        // @ts-ignore
        webkitallowfullscreen
        mozallowfullscreen
        allowfullscreen
      ></iframe>
    </div>
  );
};
