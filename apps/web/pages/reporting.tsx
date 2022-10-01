import { Icon } from "@calcom/ui";
import { Badge, ButtonGroup, EmptyScreen, Shell, Tooltip } from "@calcom/ui/v2";
import Button from "@calcom/ui/v2/core/Button";

export default function Reporting() {
  // we're not doing any i18n yet because this is a temporary page
  return (
    <Shell>
      <EmptyScreen
        Icon={Icon.FiBarChart}
        headline="Reporting"
        description={
          <>
            This is an{" "}
            <a target="_blank" href="https://cal.com/pricing" rel="noreferrer">
              <Badge variant="blue">ULTIMATE</Badge>
            </a>{" "}
            feature starting at <strong>$79/month</strong>. Use Reporting to gain valuable insights about your
            personal and team booking statistics, create graphs or run SQL queries.
          </>
        }
        buttonRaw={
          <ButtonGroup>
            <Tooltip content="Click to remove from navigation">
              <Button color="secondary">I&apos;m not interested</Button>
            </Tooltip>
            <Button target="_blank" href="https://cal.com/sales" color="primary">
              Contact Sales
            </Button>
          </ButtonGroup>
        }
      />
    </Shell>
  );
}
