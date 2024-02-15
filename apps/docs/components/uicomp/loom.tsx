export const Loom = ({ src, legend }: { src: string; legend?: string }) => {
  return (
    <div className="not-prose block my-8">
      <div className="relative pb-[62.5%] h-0 rounded-md overflow-hidden">
        <iframe
          src={src}
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0"
          // @ts-ignore
          webkitallowfullscreen
          mozallowfullscreen
          allowfullscreen
        ></iframe>
      </div>
      {legend && (
        <p className="mt-4 text-sm text-neutral-500 text-center">{legend}</p>
      )}
    </div>
  );
};
