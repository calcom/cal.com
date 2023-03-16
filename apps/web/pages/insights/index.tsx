import type { DeltaType, Color } from "@tremor/react";
import {
  Card,
  Metric,
  Text,
  Flex,
  BadgeDelta,
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
  Grid,
} from "@tremor/react";
import { DateRangePicker } from "@tremor/react";
import { useEffect, useState } from "react";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import Shell from "@calcom/features/shell/Shell";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { User } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc";
import {
  Avatar,
  Button,
  ButtonGroup,
  Dropdown,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Tooltip,
} from "@calcom/ui";
import {
  FiUsers,
  FiRefreshCcw,
  FiUserPlus,
  FiFilter,
  FiDownload,
  FiLink,
  FiUser,
} from "@calcom/ui/components/icon";

import { UpgradeTip } from "../../../../packages/features/tips";

export default function InsightsPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();
  const features = [
    {
      icon: <FiUsers className="h-5 w-5 text-red-500" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <FiRefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <FiUserPlus className="h-5 w-5 text-green-500" />,
      title: t("spot_popular_event_types"),
      description: t("spot_popular_event_types_description"),
    },
  ];
  const [startDate, setStartDate] = useState(dayjs().subtract(1, "month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [timeView, setTimeView] = useState<"month" | "week" | "year">("week");
  const [filterEventType, setFilterEventType] = useState<boolean>(false);
  const [filterUser, setFilterUser] = useState<boolean>(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(null);

  const { data: eventsTimeLine } = trpc.viewer.analytics.eventsTimeline.useQuery({
    timeView,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId: selectedTeamId || -1,
  });

  return (
    <div>
      <Shell>
        <UpgradeTip
          title={t("make_informed_decisions")}
          description={t("make_informed_decisions_description")}
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
            <div className="mb-4 ml-auto flex w-full">
              <TeamList selectedTeamId={selectedTeamId} setTeamId={setSelectedTeamId} />

              <Dropdown>
                <DropdownMenuTrigger className="mx-2 py-0 px-0">
                  <Tooltip content={t("filter") /* Filter */}>
                    <Button
                      variant="button"
                      color="secondary"
                      target="_blank"
                      rel="noreferrer"
                      StartIcon={FiFilter}
                      className="w-32">
                      <p>Add filter</p>
                    </Button>
                  </Tooltip>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    className="px-3 py-2"
                    onClick={() => setFilterEventType(!filterEventType)}>
                    <p className="flex flex-row">
                      <FiLink className="mr-2 h-4 w-4" /> Event Type
                    </p>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="px-3 py-2" onClick={() => setFilterUser(!filterUser)}>
                    <p className="flex flex-row">
                      <FiUser className="mr-2 h-4 w-4" /> User
                    </p>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
              {filterUser && selectedTeamId && (
                <UsersInTeamList
                  selectedTeamId={selectedTeamId}
                  selectedUserId={selectedUserId}
                  setUserId={setSelectedUserId}
                />
              )}

              {filterEventType && selectedTeamId && (
                <EventTypeList
                  selectedTeamId={selectedTeamId}
                  selectedEventTypeId={selectedEventTypeId}
                  setEventTypeId={setSelectedEventTypeId}
                />
              )}

              <ButtonGroup combined containerProps={{ className: "hidden lg:flex mr-2" }}>
                {/* <Tooltip content={t("settings")}>
                  <Button
                    variant="icon"
                    color="secondary"
                    target="_blank"
                    rel="noreferrer"
                    StartIcon={FiSettings}
                    className="h-[38px]"
                  />
                </Tooltip> */}
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
              {selectedTeamId && (
                <KPICards
                  startDate={startDate.toISOString()}
                  endDate={endDate.toISOString()}
                  teamId={selectedTeamId}
                />
              )}
              <Line title={t("event_trends" /* "Events trends" */)} data={eventsTimeLine || []} />
              {/* <TeamTable /> */}
              <div className="grid grid-cols-2 gap-5">
                {selectedTeamId && (
                  <PopularEvents startDate={startDate} endDate={endDate} teamId={selectedTeamId} />
                )}
                {selectedTeamId && (
                  <AverageEventDuration startDate={startDate} endDate={endDate} teamId={selectedTeamId} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-5">
                {selectedTeamId && (
                  <MembersWithMostBookings startDate={startDate} endDate={endDate} teamId={selectedTeamId} />
                )}
                {selectedTeamId && (
                  <MembersWithLeastBookings startDate={startDate} endDate={endDate} teamId={selectedTeamId} />
                )}
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
        className="mt-4 h-80"
        data={data}
        categories={["Created", "Completed", "Rescheduled", "Cancelled"]}
        index="Month"
        colors={["gray", "green", "blue", "red"]}
        valueFormatter={valueFormatter}
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
      className="mt-0 max-w-sm"
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
      <Table className="mt-5">
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
          className="mt-4 h-80"
          data={data}
          index="Date"
          categories={["Average"]}
          colors={["blue"]}
          valueFormatter={valueFormatter}
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
  data:
    | { userId: number | null; user: User; emailMd5?: string; count: number; Username?: string }[]
    | undefined;
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
                    alt={item.user.name || ""}
                    size="sm"
                    imageSrc={item.user.avatar}
                    title={item.user.name || ""}
                    className="m-2"
                    gravatarFallbackMd5={item.emailMd5}
                  />
                  <p className="my-auto mx-0">
                    <strong>{item.user.name}</strong>
                  </p>
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
    <Grid numColsSm={2} numColsLg={4} className="gap-x-6 gap-y-6">
      {isSuccess &&
        categories.map((item) => (
          <Card key={item.title}>
            <Text>{item.title}</Text>
            <Flex className="items-baseline justify-start space-x-3 truncate">
              <Metric>{valueFormatter(data[item.index].count)}</Metric>
            </Flex>
            <Flex className="mt-4 justify-start space-x-2">
              <BadgeDelta
                deltaType={CalculateDeltaType(data[item.index].deltaPrevious - data[item.index].count)}
              />
              <Flex className="justify-start space-x-1 truncate">
                <Text
                  color={colors[CalculateDeltaType(data[item.index].deltaPrevious - data[item.index].count)]}>
                  {Number(data[item.index].deltaPrevious).toFixed(0)}%
                </Text>

                <Tooltip content={`From: ${data.previousRange.startDate} To: ${data.previousRange.endDate}`}>
                  <small className="relative top-px text-xs text-gray-600">from last period</small>
                </Tooltip>
              </Flex>
            </Flex>
          </Card>
        ))}
    </Grid>
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

const TeamList = ({
  selectedTeamId,
  setTeamId,
}: {
  selectedTeamId: number | null;
  setTeamId: (teamId: number) => void;
}) => {
  const { data, isSuccess } = trpc.viewer.analytics.teamListForUser.useQuery();

  useEffect(() => {
    if (data && data?.length > 0) {
      setTeamId(data[0].id);
    }
  }, [data]);

  return (
    <>
      {isSuccess && selectedTeamId && data && data?.length > 0 && (
        <select
          defaultValue={selectedTeamId === null ? data[0].id : selectedTeamId}
          onChange={(event) => {
            if (data && data?.length > 0) {
              setTeamId(Number(event.target.value));
            }
          }}
          value={selectedTeamId}>
          {data &&
            data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      )}
    </>
  );
};

const UsersInTeamList = ({
  selectedUserId,
  selectedTeamId,
  setUserId,
}: {
  selectedUserId: number | null;
  selectedTeamId: number;
  setUserId: (userId: number) => void;
}) => {
  const { data, isSuccess } = trpc.viewer.analytics.userList.useQuery({
    teamId: selectedTeamId,
  });

  return (
    <>
      {isSuccess && data && data?.length > 0 && (
        <select
          defaultValue={selectedUserId === null ? data[0].id : selectedUserId}
          onChange={(event) => {
            if (data && data?.length > 0) {
              setUserId(Number(event.target.value));
            }
          }}
          value={selectedUserId || ""}>
          {data &&
            data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      )}
    </>
  );
};

const EventTypeList = ({
  selectedEventTypeId,
  setEventTypeId,
  selectedTeamId,
}: {
  selectedEventTypeId: number | null;
  setEventTypeId: (eventTypeId: number) => void;
  selectedTeamId: number;
}) => {
  const { data, isSuccess } = trpc.viewer.analytics.eventTypeList.useQuery({
    teamId: selectedTeamId,
  });

  return (
    <>
      {isSuccess && data && data?.length > 0 && (
        <select
          defaultValue={selectedEventTypeId === null ? data[0].id : selectedEventTypeId}
          onChange={(event) => {
            if (data && data?.length > 0) {
              setEventTypeId(Number(event.target.value));
            }
          }}
          value={selectedEventTypeId || ""}>
          {data &&
            data.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} ({item.slug})
              </option>
            ))}
        </select>
      )}
    </>
  );
};

function TeamTable() {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const isPersonSelected = (Person: Person) =>
    selectedNames.includes(Person.name) || selectedNames.length === 0;

  return (
    <Card>
      <MultiSelectBox
        onValueChange={(value) => setSelectedNames(value)}
        placeholder="Select team members..."
        className="max-w-xs">
        {members.map((item) => (
          <MultiSelectBoxItem key={item.name} value={item.name} text={item.name} />
        ))}
      </MultiSelectBox>
      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell className="text-right">Created</TableHeaderCell>
            <TableHeaderCell className="text-right">Completed</TableHeaderCell>
            <TableHeaderCell className="text-right">Rescheduled</TableHeaderCell>
            <TableHeaderCell className="text-right">Team</TableHeaderCell>
            <TableHeaderCell className="text-right">Status</TableHeaderCell>
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
                <TableCell className="text-right">{item.created}</TableCell>
                <TableCell className="text-right">{item.completed}</TableCell>
                <TableCell className="text-right">{item.rescheduled}</TableCell>
                <TableCell className="text-right">{item.team}</TableCell>
                <TableCell className="text-right">
                  <BadgeDelta deltaType={item.deltaType} size="xs">
                    {item.status}
                  </BadgeDelta>
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
        className="mt-4 h-80"
        data={data}
        index="Month"
        categories={["Sales", "Profit"]}
        colors={["indigo", "fuchsia"]}
        stack={false}
        valueFormatter={valueFormatter}
      />
    </Card>
  );
}
