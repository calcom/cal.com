import cn from "classnames"
import { Section } from "@components/uicomp/section"
import { Logo } from "@components/common-alt/logo"
import config from "@project-config"

export const Footer = ({ sidebar, hideGuides, skipLogoColumn, background, compact, path }) => {
  return <footer className="relative not-prose hidden">
      <Section hideGuides={hideGuides} noPaddingX={sidebar} full background="light" rounded padding={compact ? "sm" : "md"} className="footer text-lg font-medium rounded-lg">
        <div className={cn(
          "grid gap-8 px-4 sm:px-12",
          {
            "grid-cols-1 sm:grid-cols-1": sidebar,
            "grid-cols-1 sm:grid-cols-1 md:grid-cols-1": !sidebar,
          })}>
          <div className={skipLogoColumn ? "hidden" : "block"}>
                <Logo className="h-6" />
          </div>

          <div className={cn(
              "block",
              {
                "md:hidden": !sidebar,
                "sm:hidden": sidebar,
              }
            )} />
          <ul className="flex justify-between space-x-2">
            <li>Need help? <a className="text-black underline underline-offset-4" href={config?.links?.slack}>Join our Slack</a>.</li>
            <li>Star us on <a className="text-black underline underline-offset-4" href={config?.links?.github}>GitHub</a>.</li>
            <li>Follow Cal.com on <a className="text-black underline underline-offset-4" href={config?.links?.twitter}>Twitter</a>.</li>

          </ul>
        </div>
      </Section>
    </footer>
}
