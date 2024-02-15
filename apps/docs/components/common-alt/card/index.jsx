import { Button } from "@components/uicomp/button"

export const Card = ({
  title,
  Icon,
  children,
  cta,
  ctaHref
}) => {
  return <div className="flex flex-col gap-2">
      {Icon && <Icon className="ml-[-3px] mb-1 sm:mb-2 w-8 h-8 flex-none" />}
      <h1 className="text-neutral-900 font-semibold text-smb">{ title }</h1>
      <p className="text-neutral-700 text-smb leading-relaxed">{ children }</p>
      { cta &&
        <Button type="info" size="smb" variant="link" href={ctaHref}>
          {cta}
        </Button>
      }
    </div>
}

<Card title="Hello">
  Some text, Some text Some text, Some text Some text, Some text Some text, Some text Some text, Some text
</Card>