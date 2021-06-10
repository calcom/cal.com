import {useEffect, useState, useMemo} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import { useRouter } from 'next/router';
import dayjs, { Dayjs } from 'dayjs';
import { Switch } from '@headlessui/react';
import TimezoneSelect from 'react-timezone-select';
import { ClockIcon, GlobeIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/solid';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Avatar from '../../components/Avatar';
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

import getSlots from '../../lib/slots';
import {collectPageParameters, telemetryEventTypes, useTelemetry} from "../../lib/telemetry";

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export default function Type(props) {
    // Initialise state
    const [selectedDate, setSelectedDate] = useState<Dayjs>();
    const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
    const [loading, setLoading] = useState(false);
    const [isTimeOptionsOpen, setIsTimeOptionsOpen] = useState(false);
    const [is24h, setIs24h] = useState(false);
    const [busy, setBusy] = useState([]);
    const telemetry = useTelemetry();

    const [selectedTimeZone, setSelectedTimeZone] = useState('');

    function toggleTimeOptions() {
        setIsTimeOptionsOpen(!isTimeOptionsOpen);
    }

    function toggleClockSticky() {
        localStorage.setItem('timeOption.is24hClock', (!is24h).toString());
        setIs24h(!is24h);
    }

    function setPreferredTimeZoneSticky({ value }: string) {
        localStorage.setItem('timeOption.preferredTimeZone', value);
        setSelectedTimeZone(value);
    }

    function initializeTimeOptions() {
        setSelectedTimeZone(localStorage.getItem('timeOption.preferredTimeZone') || dayjs.tz.guess());
        setIs24h(!!localStorage.getItem('timeOption.is24hClock'));
    }

    useEffect(() => {
        telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.pageView, collectPageParameters()))
    });

    // Handle date change and timezone change
    useEffect(() => {

        if ( ! selectedTimeZone ) {
            initializeTimeOptions();
        }

        const changeDate = async () => {
            if (!selectedDate) {
                return
            }

            setLoading(true);
            const res = await fetch(`/api/availability/${user}?dateFrom=${lowerBound.utc().format()}&dateTo=${upperBound.utc().format()}`);
            const busyTimes = await res.json();
            if (busyTimes.length > 0) setBusy(busyTimes);
            setLoading(false);
        }
        changeDate();
    }, [selectedDate, selectedTimeZone]);

    // Get router variables
    const router = useRouter();
    const { user, rescheduleUid } = router.query;

    // Handle month changes
    const incrementMonth = () => {
        setSelectedMonth(selectedMonth + 1);
    }

    const decrementMonth = () => {
        setSelectedMonth(selectedMonth - 1);
    }

      // Need to define the bounds of the 24-hour window
      const lowerBound = useMemo(() => {
        if(!selectedDate) {
          return
        }

        return selectedDate.startOf('day')
      }, [selectedDate])

      const upperBound = useMemo(() => {
        if(!selectedDate) return

        return selectedDate.endOf('day')
      }, [selectedDate])

    // Set up calendar
    var daysInMonth = dayjs().month(selectedMonth).daysInMonth();
    var days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    // Create placeholder elements for empty days in first week
    let weekdayOfFirst = dayjs().month(selectedMonth).date(1).day();
    if (props.user.weekStart === 'Monday') {
      weekdayOfFirst -= 1;
      if (weekdayOfFirst < 0)
        weekdayOfFirst = 6;
    }
    const emptyDays = Array(weekdayOfFirst).fill(null).map((day, i) =>
        <div key={`e-${i}`} className={"text-center w-10 h-10 rounded-full mx-auto"}>
            {null}
        </div>
    );

    // Combine placeholder days with actual days
    const calendar = [...emptyDays, ...days.map((day) =>
        <button key={day} onClick={(e) => {
            telemetry.withJitsu((jitsu) => jitsu.track(telemetryEventTypes.dateSelected, collectPageParameters()))
            setSelectedDate(dayjs().tz(selectedTimeZone).month(selectedMonth).date(day))
        }} disabled={selectedMonth < parseInt(dayjs().format('MM')) && dayjs().month(selectedMonth).format("D") > day} className={"text-center w-10 h-10 rounded-full mx-auto " + (dayjs().isSameOrBefore(dayjs().date(day).month(selectedMonth)) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-400 font-light') + (dayjs(selectedDate).month(selectedMonth).format("D") == day ? ' bg-blue-600 text-white-important' : '')}>
            {day}
        </button>
    )];

    const times = useMemo(() =>
      getSlots({
        calendarTimeZone: props.user.timeZone,
        selectedTimeZone: selectedTimeZone,
        eventLength: props.eventType.length,
        selectedDate: selectedDate,
        dayStartTime: props.user.startTime,
        dayEndTime: props.user.endTime,
      })
    , [selectedDate, selectedTimeZone])

    // Check for conflicts
    for(let i = times.length - 1; i >= 0; i -= 1) {
      busy.forEach(busyTime => {
          let startTime = dayjs(busyTime.start);
          let endTime = dayjs(busyTime.end);

          // Check if start times are the same
          if (dayjs(times[i]).format('HH:mm') == startTime.format('HH:mm')) {
              times.splice(i, 1);
          }

          // Check if time is between start and end times
          if (dayjs(times[i]).isBetween(startTime, endTime)) {
              times.splice(i, 1);
          }

          // Check if slot end time is between start and end time
          if (dayjs(times[i]).add(props.eventType.length, 'minutes').isBetween(startTime, endTime)) {
              times.splice(i, 1);
          }

          // Check if startTime is between slot 
          if(startTime.isBetween(dayjs(times[i]), dayjs(times[i]).add(props.eventType.length, 'minutes'))) {
            times.splice(i, 1);
          }
      });
    }

    // Display available times
    const availableTimes = times.map((time) =>
        <div key={dayjs(time).utc().format()}>
            <Link href={`/${props.user.username}/book?date=${dayjs(time).utc().format()}&type=${props.eventType.id}` + (rescheduleUid ? "&rescheduleUid=" + rescheduleUid : "")}>
                <a key={dayjs(time).format("hh:mma")} className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">{dayjs(time).tz(selectedTimeZone).format(is24h ? "HH:mm" : "hh:mma")}</a>
            </Link>
        </div>
    );

    return (
      <div>
        <Head>
          <title>
            {rescheduleUid && "Reschedule"} {props.eventType.title} | {props.user.name || props.user.username} |
            Calendso
          </title>
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main
          className={
            "mx-auto my-24 transition-max-width ease-in-out duration-500 " +
            (selectedDate ? "max-w-6xl" : "max-w-3xl")
          }
        >
          <div className="bg-white shadow rounded-lg">
            <div className="sm:flex px-4 py-5 sm:p-4">
              <div
                className={
                  "pr-8 sm:border-r " + (selectedDate ? "sm:w-1/3" : "sm:w-1/2")
                }
              >
                <Avatar user={props.user} className="w-16 h-16 rounded-full mb-4" />
                <h2 className="font-medium text-gray-500">{props.user.name}</h2>
                <h1 className="text-3xl font-semibold text-gray-800 mb-4">
                  {props.eventType.title}
                </h1>
                <p className="text-gray-500 mb-1 px-2 py-1 -ml-2">
                  <ClockIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                  {props.eventType.length} minutes
                </p>
                <button
                  onClick={toggleTimeOptions}
                  className="text-gray-500 mb-1 px-2 py-1 -ml-2"
                >
                  <GlobeIcon className="inline-block w-4 h-4 mr-1 -mt-1" />
                  {selectedTimeZone}
                  <ChevronDownIcon className="inline-block w-4 h-4 ml-1 -mt-1" />
                </button>
                {isTimeOptionsOpen && (
                  <div className="w-full rounded shadow border bg-white px-4 py-2">
                    <div className="flex mb-4">
                      <div className="w-1/2 font-medium">Time Options</div>
                      <div className="w-1/2">
                        <Switch.Group
                          as="div"
                          className="flex items-center justify-end"
                        >
                          <Switch.Label as="span" className="mr-3">
                            <span className="text-sm text-gray-500">am/pm</span>
                          </Switch.Label>
                          <Switch
                            checked={is24h}
                            onChange={toggleClockSticky}
                            className={classNames(
                              is24h ? "bg-blue-600" : "bg-gray-200",
                              "relative inline-flex flex-shrink-0 h-5 w-8 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            )}
                          >
                            <span className="sr-only">Use setting</span>
                            <span
                              aria-hidden="true"
                              className={classNames(
                                is24h ? "translate-x-3" : "translate-x-0",
                                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"
                              )}
                            />
                          </Switch>
                          <Switch.Label as="span" className="ml-3">
                            <span className="text-sm text-gray-500">24h</span>
                          </Switch.Label>
                        </Switch.Group>
                      </div>
                    </div>
                    <TimezoneSelect
                      id="timeZone"
                      value={selectedTimeZone}
                      onChange={setPreferredTimeZoneSticky}
                      className="mb-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 mt-1 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                )}
                <p className="text-gray-600 mt-3 mb-8">
                  {props.eventType.description}
                </p>
              </div>
              <div
                className={
                  "mt-8 sm:mt-0 " +
                  (selectedDate
                    ? "sm:w-1/3 border-r sm:px-4"
                    : "sm:w-1/2 sm:pl-4")
                }
              >
                <div className="flex text-gray-600 font-light text-xl mb-4 ml-2">
                  <span className="w-1/2">
                    {dayjs().month(selectedMonth).format("MMMM YYYY")}
                  </span>
                  <div className="w-1/2 text-right">
                    <button
                      onClick={decrementMonth}
                      className={
                        "mr-4 " +
                        (selectedMonth < parseInt(dayjs().format("MM")) &&
                          "text-gray-400")
                      }
                      disabled={selectedMonth < parseInt(dayjs().format("MM"))}
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button onClick={incrementMonth}>
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-y-4 text-center">
                  {props.user.weekStart !== 'Monday' ? (
                    <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Sun
                  </div>
                  ) : null}
                  <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Mon
                  </div>
                  <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Tue
                  </div>
                  <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Wed
                  </div>
                  <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Thu
                  </div>
                  <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Fri
                  </div>
                  <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Sat
                  </div>
                  {props.user.weekStart === 'Monday' ? (
                    <div className="uppercase text-gray-400 text-xs tracking-widest">
                    Sun
                  </div>
                  ) : null}
                  {calendar}
                </div>
              </div>
              {selectedDate && (
                <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3  md:max-h-97 overflow-y-auto">
                  <div className="text-gray-600 font-light text-xl mb-4 text-left">
                    <span className="w-1/2">
                      {dayjs(selectedDate).format("dddd DD MMMM YYYY")}
                    </span>
                  </div>
                  {!loading ? availableTimes : <div className="loader"></div>}
                </div>
              )}
            </div>
          </div>
          {/* note(peer): 
            you can remove calendso branding here, but we'd also appreciate it, if you don't <3 
          */}
          <div className="text-xs text-right pt-1">
            <Link href="https://calendso.com">
              <a
                style={{ color: "#104D86" }}
                className="opacity-50 hover:opacity-100"
              >
                powered by{" "}
                <img
                  style={{ top: -2 }}
                  className="w-auto inline h-3 relative"
                  src="/calendso-logo-word.svg"
                  alt="Calendso Logo"
                />
              </a>
            </Link>
          </div>
        </main>
      </div>
    );
}

export async function getServerSideProps(context) {
    const user = await prisma.user.findFirst({
        where: {
          username: context.query.user,
        },
        select: {
            id: true,
            username: true,
            name: true,
            email: true,
            bio: true,
            avatar: true,
            eventTypes: true,
            startTime: true,
            timeZone: true,
            endTime: true,
            weekStart: true,
        }
    });

    if (!user) {
        return {
            notFound: true,
        }
    }

    const eventType = await prisma.eventType.findFirst({
        where: {
            userId: user.id,
            slug: {
                equals: context.query.type,
            },
        },
        select: {
            id: true,
            title: true,
            description: true,
            length: true
        }
    });

    return {
        props: {
            user,
            eventType,
        },
    }
}
