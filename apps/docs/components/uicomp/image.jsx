import cn from "classnames"

export const Image = ({ src, alt, legend, className, bleed, bordered }) => {
  return <div className="not-prose block my-8">
    <div>
      <img
        className={cn(
          "w-full rounded-md", {
            "border border-neutral-200": bordered
          })}
        src={src}
        alt={alt}
      />
      </div>
      { legend && <p className="mt-4 text-sm text-neutral-500 text-center">
          {legend}
        </p>}
    </div>
}
