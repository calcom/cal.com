import { TextHighlight } from "../../ui";

const textHighlightClass = "!bg-black text-white rounded-md border-none ";
const HIGHLIGHTS_LIST = [
  {
    text: (
      <div>
        <TextHighlight className={textHighlightClass}>$2.3k MRR</TextHighlight> from SaaS projects
      </div>
    ),
    icon: <></>,
  },
  {
    text: (
      <div>
        <TextHighlight className={textHighlightClass}>#2 Product</TextHighlight>
        <br /> of the Day on ProductHunt
      </div>
    ),
    icon: <></>,
  },
  {
    text: (
      <div>
        <TextHighlight className={textHighlightClass}>Expertise in</TextHighlight> Next.js, TailwindCSS,
        Supabase etc.
      </div>
    ),
    icon: <></>,
  },
];

const Highlights = () => {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium opacity-50">Profile Highlights</h3>
      <div className="flex items-start justify-start gap-3 overflow-x-auto pb-2">
        {HIGHLIGHTS_LIST?.map((item) => (
          <div
            className="flex h-[150px] w-[150px] flex-none items-center justify-center rounded-xl border bg-white p-4 text-center text-base text-gray-500 shadow-[0_0_3px_rgba(0,0,0,0.07)]"
            key={item?.text}>
            {item?.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Highlights;
