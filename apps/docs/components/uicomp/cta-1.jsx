import { Button } from "@components/uicomp/button"

export const CTA = ({ label, href }) => {
  return <div className="mt-12">
      <Button href={href} size="sm" variant="pill">{ label } →</Button>
    </div>
}