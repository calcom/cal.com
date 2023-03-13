import type { DeltaType, Color } from "@tremor/react";
import {
  Card,
  Metric,
  Text,
  Flex,
  BadgeDelta,
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

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL, APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc";
import { Avatar, Button, ButtonGroup, Tooltip } from "@calcom/ui";
import {
  FiUsers,
  FiRefreshCcw,
  FiUserPlus,
  FiMail,
  FiVideo,
  FiEyeOff,
  FiFilter,
  FiSettings,
  FiDownload,
} from "@calcom/ui/components/icon";

import { UpgradeTip } from "../../../../packages/features/tips";

export default function InsightsPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();
  const features = [
    {
      icon: <FiUsers className="w-5 h-5 text-red-500" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <FiRefreshCcw className="w-5 h-5 text-blue-500" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <FiUserPlus className="w-5 h-5 text-green-500" />,
      title: t("spot_popular_event_types"),
      description: t("spot_popular_event_types_description"),
    },   
  ];
  const [startDate, setStartDate] = useState(dayjs().subtract(1, "month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [timeView, setTimeView] = useState<"month" | "week" | "year">("week");

  const { data: eventsTimeLine } = trpc.viewer.analytics.eventsTimeline.useQuery({
    timeView,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId: 21,
  });
  return (
    <div>
      <Shell>
        <UpgradeTip
          title={t("make_informed_decisions")}
          description={t(
            "make_informed_decisions_description"
          )}
          features={features}
          background="/banners/insights.jpg"
          buttons={
            <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
              <ButtonGroup>
                <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                  {t("create_team")}
                </Button>
                <Button color="secondary" href="https://go.cal.com/insights" target="_blank">
                  {t("learn_more")}
                </Button>
              </ButtonGroup>
            </div>
          }>
          <>
            <div className="mb-4 ml-auto flex w-[40%]">
              <ButtonGroup combined containerProps={{ className: "hidden lg:flex mr-2" }}>
                <Tooltip content={t("filter") /* Filter */}>
                  <Button
                    variant="icon"
                    color="secondary"
                    target="_blank"
                    rel="noreferrer"
                    StartIcon={FiFilter}
                    className="h-[38px]"
                  />
                </Tooltip>
                <Tooltip content={t("settings")}>
                  <Button
                    variant="icon"
                    color="secondary"
                    target="_blank"
                    rel="noreferrer"
                    StartIcon={FiSettings}
                    className="h-[38px]"
                  />
                </Tooltip>
                <Tooltip content={t("download_csv") /*"Download *.csv*/}>
                  <Button
                    variant="icon"
                    color="secondary"
                    target="_blank"
                    rel="noreferrer"
                    StartIcon={FiDownload}
                    className="h-[38px]"
                  />
                </Tooltip>
              </ButtonGroup>
              <DateSelect
                dates={[startDate.toDate(), endDate.toDate()]}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
              />
            </div>
            <div className="space-y-6">
              <KPICards startDate={startDate.toISOString()} endDate={endDate.toISOString()} teamId={21} />
              <Line title={t("event_trends" /* "Events trends" */)} data={eventsTimeLine || []} />
              {/* <TeamTable /> */}
              <div className="grid grid-cols-2 gap-5">
                <PopularEvents startDate={startDate} endDate={endDate} teamId={21} />
                <AverageEventDuration startDate={startDate} endDate={endDate} teamId={21} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <MembersWithMostBookings startDate={startDate} endDate={endDate} teamId={21} />
                <MembersWithLeastBookings startDate={startDate} endDate={endDate} teamId={21} />
              </div>
              <small className="block text-center text-gray-600">
                {t("looking_for_more_analytics")}
                <a
                  className="text-blue-500 hover:underline"
                  href="mailto:updates@cal.com?subject=Feature%20Request%3A%20More%20Analytics&body=Hey%20Cal.com%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
                  {t("contact_support")}
                </a>
              </small>
            </div>
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

const DateSelect = ({
  dates,
  setStartDate,
  setEndDate,
}: {
  dates: Date[];
  setStartDate: (date: Dayjs) => void;
  setEndDate: (date: Dayjs) => void;
}) => {
  const currentDate = dayjs();
  const [start, end] = dates;
  return (
    <DateRangePicker
      value={[start, end, null]}
      // defaultValue={dates}
      onValueChange={(datesArray) => {
        const [selected, ...rest] = datesArray;
        const [start, end] = datesArray;
        if (start && end) {
          setStartDate(dayjs(start));
          setEndDate(dayjs(end));
          return;
        } else if (start && !end) {
          const newDates = [dates[1], selected];
          setStartDate(dayjs(newDates[0]));
          setEndDate(dayjs(newDates[1]));
        }
      }}
      options={undefined}
      enableDropdown={true}
      placeholder="Select Date Range..."
      enableYearPagination={true}
      minDate={currentDate.subtract(2, "year").toDate()}
      maxDate={currentDate.toDate()}
      color="blue"
      maxWidth="max-w-none"
      marginTop="mt-0"
    />
  );
};

const PopularEvents = ({
  startDate,
  endDate,
  teamId,
}: {
  startDate: Dayjs;
  endDate: Dayjs;
  teamId: number;
}) => {
  const { data, isSuccess } = trpc.viewer.analytics.popularEventTypes.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });
  return (
    <Card>
      <Title>Popular Events</Title>
      <Table marginTop="mt-5">
        <TableBody>
          {isSuccess ? (
            data?.map((item) => (
              <TableRow key={item.eventTypeId}>
                <TableCell>{item.eventTypeName}</TableCell>
                <TableCell>
                  <Text>
                    <strong>{item.count}</strong>
                  </Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>No event types found</TableCell>
              <TableCell>
                <strong>0</strong>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

const AverageEventDuration = ({
  startDate,
  endDate,
  teamId,
}: {
  startDate: Dayjs;
  endDate: Dayjs;
  teamId: number;
}) => {
  const { data, isSuccess } = trpc.viewer.analytics.averageEventDuration.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });
  return (
    <Card>
      <Title>Average Event Duration</Title>
      {isSuccess && data.length > 0 && (
        <LineChart
          marginTop="mt-4"
          data={data}
          dataKey="Date"
          categories={["Average"]}
          colors={["blue"]}
          valueFormatter={valueFormatter}
          height="h-80"
        />
      )}
    </Card>
  );
};

const MembersWithMostBookings = ({
  startDate,
  endDate,
  teamId,
}: {
  startDate: Dayjs;
  endDate: Dayjs;
  teamId: number;
}) => {
  const { data, isSuccess } = trpc.viewer.analytics.membersWithMostBookings.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });
  return (
    <Card>
      <Title>Most Booked Members</Title>
      <UsersTotalBookingTable isSuccess={isSuccess} data={data} />
    </Card>
  );
};

const MembersWithLeastBookings = ({
  startDate,
  endDate,
  teamId,
}: {
  startDate: Dayjs;
  endDate: Dayjs;
  teamId: number;
}) => {
  const { data, isSuccess } = trpc.viewer.analytics.membersWithLeastBookings.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });

  return (
    <Card>
      <Title>Least Booked Members</Title>
      <UsersTotalBookingTable isSuccess={isSuccess} data={data} />
    </Card>
  );
};

const UsersTotalBookingTable = ({
  isSuccess,
  data,
}: {
  isSuccess: boolean;
  data: { userId: number | null; user: User; emailMd5: string; count: number; Username: any }[] | undefined;
}) => {
  return (
    <Table>
      <TableBody>
        <>
          {isSuccess ? (
            data?.map((item) => (
              <TableRow key={item.userId}>
                <TableCell className="flex flex-row">
                  <Avatar
                    alt={item.user.name}
                    size="sm"
                    imageSrc={item.user.avatar}
                    title={item.user.name}
                    className="m-2"
                    gravatarFallbackMd5={item.emailMd5}
                  />
                  <strong className="align-super">{item.user.name}</strong>
                </TableCell>
                <TableCell>
                  <Text>
                    <strong>{item.count}</strong>
                  </Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>No members found</TableCell>
            </TableRow>
          )}
        </>
      </TableBody>
    </Table>
  );
};

const colors: { [key: string]: Color } = {
  increase: "emerald",
  moderateIncrease: "emerald",
  unchanged: "orange",
  moderateDecrease: "rose",
  decrease: "rose",
};

function CalculateDeltaType(delta: number) {
  if (delta > 0) {
    return delta > 10 ? "increase" : "moderateIncrease";
  } else if (delta < 0) {
    return delta < -10 ? "decrease" : "moderateDecrease";
  } else {
    return "unchanged";
  }
}

const categories: {
  title: string;
  index: "created" | "completed" | "rescheduled" | "cancelled";
}[] = [
  {
    title: "Events created",
    index: "created",
  },
  {
    title: "Events completed",
    index: "completed",
  },
  {
    title: "Events rescheduled",
    index: "rescheduled",
  },
  {
    title: "Events cancelled",
    index: "cancelled",
  },
];

const KPICards = ({ startDate, endDate, teamId }: { startDate: string; endDate: string; teamId: number }) => {
  const { data, isSuccess } = trpc.viewer.analytics.eventsByStatus.useQuery({
    startDate,
    endDate,
    teamId,
  });

  return (
    <ColGrid numColsSm={2} numColsLg={4} gapX="gap-x-6" gapY="gap-y-6">
      {isSuccess &&
        categories.map((item) => (
          <Card key={item.title}>
            <Text>{item.title}</Text>
            <Flex
              justifyContent="justify-start"
              alignItems="items-baseline"
              spaceX="space-x-3"
              truncate={true}>
              <Metric>{valueFormatter(data[item.index].count)}</Metric>
            </Flex>
            <Flex justifyContent="justify-start" spaceX="space-x-2" marginTop="mt-4">
              <BadgeDelta
                deltaType={CalculateDeltaType(data[item.index].deltaPrevious - data[item.index].count)}
              />
              <Flex justifyContent="justify-start" spaceX="space-x-1" truncate={true}>
                <Text
                  color={colors[CalculateDeltaType(data[item.index].deltaPrevious - data[item.index].count)]}>
                  {Number(data[item.index].deltaPrevious).toFixed(0)}%
                </Text>

                <Tooltip content={`From: ${data.previousRange.startDate} To: ${data.previousRange.endDate}`}>
                  <small className="relative text-xs text-gray-600 top-px">from last period</small>
                </Tooltip>
              </Flex>
            </Flex>
          </Card>
        ))}
    </ColGrid>
  );
};

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
