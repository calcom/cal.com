import {
  Card,
  Metric,
  Text,
  Flex,
  BadgeDelta,
  DeltaType,
  Color,
  ColGrid,
  LineChart,
  Title,
  Table,
  TableRow,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableBody,
  MultiSelectBox,
  MultiSelectBoxItem,
  BarChart,
} from "@tremor/react";
import { DateRangePicker } from "@tremor/react";
import { useState } from "react";

import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL, APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, Button, ButtonGroup, Tooltip } from "@calcom/ui";
import {
  FiSettings,
  FiDownload,
  FiFilter,
  FiUsers,
  FiRefreshCcw,
  FiUserPlus,
  FiMail,
  FiVideo,
  FiEyeOff,
} from "@calcom/ui/components/icon";

import { UpgradeTip } from "../../../../packages/features/tips";

export default function InsightsPage() {
  const { t } = useLocale();

  const features = [
    {
      icon: <FiUsers className="h-5 w-5 text-red-500" />,
      title: t("Lorem Ipsum"),
      description: t("dolor sit amet, consetetur sadipscing elitr,"),
    },
    {
      icon: <FiRefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("Lorem Ipsum"),
      description: t("dolor sit amet, consetetur sadipscing elitr,"),
    },
    {
      icon: <FiUserPlus className="h-5 w-5 text-green-500" />,
      title: t("Lorem Ipsum"),
      description: t("dolor sit amet, consetetur sadipscing elitr,"),
    },
    {
      icon: <FiMail className="h-5 w-5 text-orange-500" />,
      title: t("Lorem Ipsum"),
      description: t("dolor sit amet, consetetur sadipscing elitr,"),
    },
    {
      icon: <FiVideo className="h-5 w-5 text-purple-500" />,
      title: t("Lorem Ipsum"),
      description: t("dolor sit amet, consetetur sadipscing elitr,"),
    },
    {
      icon: <FiEyeOff className="h-5 w-5 text-indigo-500" />,
      title: t("Lorem Ipsum"),
      description: t("dolor sit amet, consetetur sadipscing elitr,", { appName: APP_NAME }),
    },
  ];
  return (
    <div>
      <Shell heading="Insights" subtitle="View your Insights">
        <UpgradeTip
          dark
          title={t("teams_plan_required")}
          description={t(
            "Insights help you learn more about the booking statistics of you and your team members and make better decisions."
          )}
          features={features}
          background="/routing-form-banner-background.jpg"
          buttons={
            <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
              <ButtonGroup>
                <Button color="secondary" href={`${WEBAPP_URL}/settings/teams/new`}>
                  {t("upgrade")}
                </Button>
                <Button
                  color="minimal"
                  className="!bg-transparent text-white opacity-50 hover:opacity-100"
                  href="https://go.cal.com/insights"
                  target="_blank">
                  {t("learn_more")}
                </Button>
              </ButtonGroup>
            </div>
          }>
          <>
            <Shell
              heading={t("insights")}
              subtitle={t("view_your_insights")}
              CTA={
                <div className="flex">
                  <ButtonGroup combined containerProps={{ className: "hidden lg:flex mx-2" }}>
                    <Tooltip content={t("filter") /* Filter */}>
                      <Button
                        variant="icon"
                        color="secondary"
                        target="_blank"
                        rel="noreferrer"
                        StartIcon={FiFilter}
                      />
                    </Tooltip>
                    <Tooltip content={t("settings")}>
                      <Button
                        variant="icon"
                        color="secondary"
                        target="_blank"
                        rel="noreferrer"
                        StartIcon={FiSettings}
                      />
                    </Tooltip>
                    <Tooltip content={t("download_csv") /*"Download *.csv*/}>
                      <Button
                        variant="icon"
                        color="secondary"
                        target="_blank"
                        rel="noreferrer"
                        StartIcon={FiDownload}
                      />
                    </Tooltip>
                  </ButtonGroup>
                  <DateSelect />
                </div>
              }>
              <div className="space-y-6">
                <KPICards />
                <Line
                  title={t("event_trends" /* "Events trends" */)}
                  data={[
                    {
                      Month: "Dec 15",
                      Created: 2890,
                      Completed: 2390,
                      Rescheduled: 500,
                      Cancelled: 100,
                    },
                    {
                      Month: "Dec 22",
                      Created: 1890,
                      Completed: 1590,
                      Rescheduled: 300,
                      Cancelled: 120,
                    },
                    {
                      Month: "Dec 29",
                      Created: 4890,
                      Completed: 4290,
                      Rescheduled: 800,
                      Cancelled: 300,
                    },
                    {
                      Month: "Jan 06",
                      Created: 3890,
                      Completed: 2400,
                      Rescheduled: 500,
                      Cancelled: 200,
                    },
                    {
                      Month: "Jan 13",
                      Created: 1890,
                      Completed: 1590,
                      Rescheduled: 200,
                      Cancelled: 50,
                    },
                  ]}
                />
                <TeamTable />
                <div className="grid grid-cols-2 gap-5">
                  <Bar
                    title={t("average_event_duration" /* "Average event duration" */)}
                    data={[
                      {
                        Month: "Jan 21",
                        Sales: 2890,
                        Profit: 2400,
                      },
                      {
                        Month: "Feb 21",
                        Sales: 1890,
                        Profit: 1398,
                      },
                      {
                        Month: "Jan 22",
                        Sales: 3890,
                        Profit: 2980,
                      },
                    ]}
                  />
                  <Bar
                    title={t("popular_days" /* "Popular days" */)}
                    data={[
                      {
                        Month: "Jan 21",
                        Sales: 2890,
                        Profit: 2400,
                      },
                      {
                        Month: "Feb 21",
                        Sales: 1890,
                        Profit: 1398,
                      },
                      {
                        Month: "Jan 22",
                        Sales: 3890,
                        Profit: 2980,
                      },
                    ]}
                  />
                </div>
                <small className="block text-center text-gray-600">
                  t{"looking_for_more_analytics" /* Looking for more analytics? */}{" "}
                  <a
                    className="text-blue-500 hover:underline"
                    href="mailto:updates@cal.com?subject=Feature%20Request%3A%20More%20Analytics&body=Hey%20Cal.com%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
                    {t("contact_support")}
                  </a>
                </small>
              </div>
            </Shell>
          </>
        </UpgradeTip>
      </Shell>
    </div>
  );
}

const valueFormatter = (number: number) => `${Intl.NumberFormat().format(number).toString()}`;

function Line({
  title,
  data,
}: {
  title: string;
  data: Array<{ Month: string; Created: number; Completed: number; Rescheduled: number; Cancelled: number }>;
}) {
  return (
    <Card>
      <Title>{title}</Title>
      <LineChart
        marginTop="mt-4"
        data={data}
        categories={["Created", "Completed", "Rescheduled", "Cancelled"]}
        dataKey="Month"
        colors={["gray", "green", "blue", "red"]}
        valueFormatter={valueFormatter}
        height="h-80"
      />
    </Card>
  );
}

function DateSelect() {
  return (
    <DateRangePicker
      value={undefined}
      defaultValue={undefined}
      onValueChange={undefined}
      options={undefined}
      enableDropdown={true}
      placeholder="Select..."
      enableYearPagination={false}
      minDate={null}
      maxDate={null}
      color="blue"
      maxWidth="max-w-none"
      marginTop="mt-0"
    />
  );
}

const colors: { [key: string]: Color } = {
  increase: "emerald",
  moderateIncrease: "emerald",
  unchanged: "orange",
  moderateDecrease: "rose",
  decrease: "rose",
};

const categories: {
  title: string;
  metric: string;
  metricPrev: string;
  delta: string;
  deltaType: DeltaType;
}[] = [
  {
    title: "Events created",
    metric: "1888",
    metricPrev: "$ 9,456",
    delta: "34.3%",
    deltaType: "moderateIncrease",
  },
  {
    title: "Events completed",
    metric: "1802",
    metricPrev: "$ 45,564",
    delta: "10.9%",
    deltaType: "moderateDecrease",
  },
  {
    title: "Events rescheduled",
    metric: "48",
    metricPrev: "856",
    delta: "25.3%",
    deltaType: "moderateIncrease",
  },
  {
    title: "Events cancelled",
    metric: "38",
    metricPrev: "856",
    delta: "25.3%",
    deltaType: "moderateDecrease",
  },
];

function KPICards() {
  return (
    <ColGrid numColsSm={2} numColsLg={4} gapX="gap-x-6" gapY="gap-y-6">
      {categories.map((item) => (
        <Card key={item.title}>
          <Text>{item.title}</Text>
          <Flex justifyContent="justify-start" alignItems="items-baseline" spaceX="space-x-3" truncate={true}>
            <Metric>{valueFormatter(parseInt(item.metric))}</Metric>
          </Flex>
          <Flex justifyContent="justify-start" spaceX="space-x-2" marginTop="mt-4">
            <BadgeDelta deltaType={item.deltaType} />
            <Flex justifyContent="justify-start" spaceX="space-x-1" truncate={true}>
              <Text color={colors[item.deltaType]}>{item.delta}</Text>
              <small className="relative top-px text-xs text-gray-600">from last month</small>
            </Flex>
          </Flex>
        </Card>
      ))}
    </ColGrid>
  );
}

type Person = {
  name: string;
  created: number;
  completed: string;
  rescheduled: string;
  team: string;
  status: string;
  deltaType: DeltaType;
};

const members: Person[] = [
  {
    name: "Peter Doe",
    created: 45,
    completed: "1",
    rescheduled: "1,200",
    team: "Cal-Marketing",
    status: "overperforming",
    deltaType: "moderateIncrease",
  },
  {
    name: "Lena Whitehouse",
    created: 35,
    completed: "900",
    rescheduled: "1",
    team: "Cal-Sales",
    status: "average",
    deltaType: "unchanged",
  },
  {
    name: "Phil Less",
    created: 52,
    completed: "930",
    rescheduled: "1",
    team: "Cal-Partnerships",
    status: "underperforming",
    deltaType: "moderateDecrease",
  },
  {
    name: "John Camper",
    created: 22,
    completed: "390",
    rescheduled: "250",
    team: "Cal-Marketing",
    status: "overperforming",
    deltaType: "increase",
  },
  {
    name: "Max Balmoore",
    created: 49,
    completed: "860",
    rescheduled: "750",
    team: "Cal-Sales",
    status: "overperforming",
    deltaType: "increase",
  },
  {
    name: "Peter Moore",
    created: 82,
    completed: "1,460",
    rescheduled: "1,500",
    team: "Cal-Marketing",
    status: "average",
    deltaType: "unchanged",
  },
  {
    name: "Joe Sachs",
    created: 49,
    completed: "1,230",
    rescheduled: "1,800",
    team: "Cal-Sales",
    status: "underperforming",
    deltaType: "moderateDecrease",
  },
];

function TeamTable() {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const isPersonSelected = (Person: Person) =>
    selectedNames.includes(Person.name) || selectedNames.length === 0;

  return (
    <Card>
      <MultiSelectBox
        handleSelect={(value) => setSelectedNames(value)}
        placeholder="Select team members..."
        maxWidth="max-w-xs">
        {members.map((item) => (
          <MultiSelectBoxItem key={item.name} value={item.name} text={item.name} />
        ))}
      </MultiSelectBox>
      <Table marginTop="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell textAlignment="text-right">Created</TableHeaderCell>
            <TableHeaderCell textAlignment="text-right">Completed</TableHeaderCell>
            <TableHeaderCell textAlignment="text-right">Rescheduled</TableHeaderCell>
            <TableHeaderCell textAlignment="text-right">Team</TableHeaderCell>
            <TableHeaderCell textAlignment="text-right">Status</TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {members
            .filter((item) => isPersonSelected(item))
            .map((item) => (
              <TableRow key={item.name}>
                <TableCell>
                  <div className="flex items-center">
                    <Avatar
                      alt={item.name}
                      size="xs"
                      imageSrc="https://www.gravatar.com/avatar/5298b7820d4bbd2758f78f154b31b0a8?s=160&d=mp&r=PG"
                    />{" "}
                    <span className="px-2">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell textAlignment="text-right">{item.created}</TableCell>
                <TableCell textAlignment="text-right">{item.completed}</TableCell>
                <TableCell textAlignment="text-right">{item.rescheduled}</TableCell>
                <TableCell textAlignment="text-right">{item.team}</TableCell>
                <TableCell textAlignment="text-right">
                  <BadgeDelta deltaType={item.deltaType} text={item.status} size="xs" />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function Bar({
  title,
  data,
}: {
  title: string;
  data: Array<{ Month: string; Sales: number; Profit: number }>;
}) {
  return (
    <Card>
      <Title>{title}</Title>
      <BarChart
        marginTop="mt-4"
        data={data}
        dataKey="Month"
        categories={["Sales", "Profit"]}
        colors={["indigo", "fuchsia"]}
        stack={false}
        valueFormatter={valueFormatter}
        height="h-80"
      />
    </Card>
  );
}
