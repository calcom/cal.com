export const TwoOfThreeCols = ({ children }) => {
  return <div className="block md:grid md:grid-cols-3 md:gap-8">
      <div className="col-span-2">
        { children }
      </div>
    </div>
}

export const ThreeColsStickyRight = ({ invertSmall, children }) => {
  return <div>
      <div className="flex flex-col-reverse md:grid md:grid-cols-3 md:gap-8">
        <div className="col-span-2">
          {children.slice(0, -1)}
        </div>
        <div className="block md:sticky sticky-top md:self-start">
          {children.slice(-1)}
        </div>
      </div>
    </div>
}