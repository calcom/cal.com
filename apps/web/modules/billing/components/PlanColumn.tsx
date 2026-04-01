import { Icon } from "@calcom/ui/components/icon";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import { Card, CardPanel } from "@coss/ui/components/card";
import Link from "next/link";

import type { PlanFeature } from "../types";

export type { PlanFeature };

export interface PlanColumnProps {
  name: string;
  badge?: string;
  price: string;
  priceSubtext: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  buttonHref: string;
  buttonTarget?: string;
  primaryButton?: boolean;
  onCtaClick?: () => void;
}

export function PlanColumn({
  name,
  badge,
  price,
  priceSubtext,
  description,
  features,
  buttonText,
  buttonHref,
  buttonTarget,
  primaryButton,
  onCtaClick,
}: PlanColumnProps): JSX.Element {
  return (
    <Card className="flex-1 gap-0 rounded-xl border-subtle p-4 py-0">
      <CardPanel className="px-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-emphasis">{name}</h3>
          {badge && (
            <Badge variant="outline" className="rounded-lg py-0.5 px-2 h-fit!">
              {badge}
            </Badge>
          )}
        </div>
        <p className="font-heading mt-2 leading-none font-semibold text-2xl text-emphasis">{price}</p>
        <p className="mt-2 leading-none font-medium text-sm text-subtle h-4">{priceSubtext}</p>

        <Button
          className="mt-4 w-full"
          variant={primaryButton ? "default" : "outline"}
          onClick={onCtaClick}
          render={
            <Link
              href={buttonHref}
              target={buttonTarget}
              rel={buttonTarget === "_blank" ? "noopener noreferrer" : undefined}
            />
          }>
          <Icon name="circle-arrow-up" />
          <span>{buttonText}</span>
        </Button>

        <p className="mt-4 text-sm text-subtle">{description}</p>

        <ul className="mt-3 space-y-2">
          {features.map((feature) => (
            <li key={feature.text} className="flex items-start gap-2 text-sm">
              <Icon name="dot" className="relative top-0.5 h-4 w-4 shrink-0 text-default" />
              <span className="text-default">{feature.text}</span>
            </li>
          ))}
        </ul>
      </CardPanel>
    </Card>
  );
}
