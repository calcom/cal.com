import { Card, Icon } from "@calcom/ui";

import { helpCards } from "@lib/settings/platform/utils";

export const HelpCards = () => {
  return (
    <>
      <div className="grid-col-1 mb-4 grid gap-2 md:grid-cols-3">
        {helpCards.map((card) => {
          return (
            <div key={card.title}>
              <Card
                icon={<Icon name={card.icon} className="h-5 w-5 text-green-700" />}
                variant={card.variant}
                title={card.title}
                description={card.description}
                actionButton={{
                  href: `${card.actionButton.href}`,
                  child: `${card.actionButton.child}`,
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};
