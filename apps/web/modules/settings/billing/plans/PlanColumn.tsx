import { Button } from "@coss/ui/components/button";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@coss/ui/components/tooltip";
import { CircleArrowUpIcon, SquareCheckIcon } from "@coss/ui/icons";
import Link from "next/link";

import type { PlanFeature } from "./plan-features";

export interface PlanColumnProps {
  name: string;
  price: string;
  priceSubtext: string;
  description: string;
  features: PlanFeature[];
  buttonText: string;
  buttonVariant?: "default" | "outline";
  buttonDisabled?: boolean;
  buttonTooltip?: string;
  buttonHref?: string;
  buttonTarget?: string;
  onButtonClick?: () => void;
}

function PlanFeatureList({ features }: { features: PlanFeature[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {features.map((feature) => (
        <li key={feature.text} className="flex items-start gap-2 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            className="mt-0.5 shrink-0"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M4.59825 1.51022e-07H10.4018C11.0791 -5.76961e-06 11.6255 -1.06357e-05 12.0679 0.0361368C12.5234 0.0733551 12.9235 0.151988 13.2937 0.340605C13.8817 0.640209 14.3598 1.11827 14.6594 1.70628C14.848 2.07646 14.9266 2.47658 14.9639 2.93211C15 3.37453 15 3.92087 15 4.59823V10.4018C15 11.0791 15 11.6255 14.9639 12.0679C14.9266 12.5234 14.848 12.9235 14.6594 13.2937C14.3598 13.8817 13.8817 14.3598 13.2937 14.6594C12.9235 14.848 12.5234 14.9266 12.0679 14.9639C11.6255 15 11.0791 15 10.4018 15H4.59823C3.92087 15 3.37453 15 2.93211 14.9639C2.47658 14.9266 2.07646 14.848 1.70628 14.6594C1.11827 14.3598 0.640209 13.8817 0.340605 13.2937C0.151988 12.9235 0.0733551 12.5234 0.0361368 12.0679C-1.06357e-05 11.6255 -5.76961e-06 11.0791 1.51019e-07 10.4018V4.59824C-5.76963e-06 3.92088 -1.05426e-05 3.37453 0.0361368 2.93211C0.0733551 2.47658 0.151988 2.07646 0.340605 1.70628C0.640209 1.11827 1.11827 0.640209 1.70628 0.340605C2.07646 0.151988 2.47658 0.0733551 2.93211 0.0361368C3.37453 -1.05426e-05 3.92089 -5.76963e-06 4.59825 1.51022e-07ZM10.8559 6.20377C11.1 5.95969 11.1 5.56396 10.8559 5.31989C10.6118 5.07581 10.2161 5.07581 9.97204 5.31989L6.66398 8.62794L5.43926 7.40322C5.19518 7.15914 4.79945 7.15914 4.55537 7.40322C4.31129 7.6473 4.31129 8.04303 4.55537 8.2871L6.22204 9.95377C6.46612 10.1978 6.86184 10.1978 7.10592 9.95377L10.8559 6.20377Z"
              fill="#343434"
            />
          </svg>
          <span className="text-default">{feature.text}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanButton({
  text,
  variant = "outline",
  disabled,
  tooltip,
  href,
  target,
  onClick,
}: {
  text: string;
  variant?: "default" | "outline";
  disabled?: boolean;
  tooltip?: string;
  href?: string;
  target?: string;
  onClick?: () => void;
}) {
  const btn =
    href && !disabled ? (
      <Button
        className="mt-4 w-full"
        variant={variant}
        disabled={disabled}
        onClick={onClick}
        render={
          <Link
            href={href}
            target={target}
            rel={target === "_blank" ? "noopener noreferrer" : undefined}
          />
        }
      >
        {!disabled && <CircleArrowUpIcon className="h-4 w-4" />}
        <span>{text}</span>
      </Button>
    ) : (
      <Button
        className="mt-4 w-full"
        variant={variant}
        disabled={disabled}
        onClick={onClick}
      >
        {!disabled && <CircleArrowUpIcon className="h-4 w-4" />}
        <span>{text}</span>
      </Button>
    );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div />}>{btn}</TooltipTrigger>
        <TooltipPopup>{tooltip}</TooltipPopup>
      </Tooltip>
    );
  }

  return btn;
}

export function PlanColumn({
  name,
  price,
  priceSubtext,
  description,
  features,
  buttonText,
  buttonVariant = "outline",
  buttonDisabled,
  buttonTooltip,
  buttonHref,
  buttonTarget,
  onButtonClick,
}: PlanColumnProps) {
  return (
    <div className="flex flex-1 flex-col">
      <h3 className="font-medium text-sm text-emphasis">{name}</h3>
      <p className="font-heading mt-2 leading-none font-semibold text-2xl text-emphasis">
        {price}
      </p>
      <p className="mt-2 h-4 leading-none text-sm text-subtle">
        {priceSubtext}
      </p>

      <PlanButton
        text={buttonText}
        variant={buttonVariant}
        disabled={buttonDisabled}
        tooltip={buttonTooltip}
        href={buttonHref}
        target={buttonTarget}
        onClick={onButtonClick}
      />

      <p className="mt-4 text-sm text-subtle font-medium">{description}</p>
      <PlanFeatureList features={features} />
    </div>
  );
}
