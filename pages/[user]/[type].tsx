import {useEffect, useState, useMemo} from 'react';
import Head from 'next/head';
import Link from 'next/link';
import prisma from '../../lib/prisma';
import { useRouter } from 'next/router';
const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isBetween = require('dayjs/plugin/isBetween');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

import getSlots from '../../lib/slots'

export default function Type(props) {
    // Initialise state
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState([]);

    // Get router variables
    const router = useRouter();
    const { user } = router.query;

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

    const calendar = days.map((day) =>
        <button key={day} onClick={(e) => setSelectedDate(dayjs().tz(dayjs.tz.guess()).month(selectedMonth).date(day))} disabled={selectedMonth < dayjs().format('MM') && dayjs().month(selectedMonth).format("D") > day} className={"text-center w-10 h-10 rounded-full mx-auto " + (dayjs().isSameOrBefore(dayjs().date(day).month(selectedMonth)) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-400 font-light') + (dayjs(selectedDate).month(selectedMonth).format("D") == day ? ' bg-blue-600 text-white-important' : '')}>
            {day}
        </button>
    );

    // Handle date change
    useEffect(async () => {
        if(!selectedDate) {
          return
        }

        setLoading(true);
        const res = await fetch(`/api/availability/${user}?dateFrom=${lowerBound.utc().format()}&dateTo=${upperBound.utc().format()}`);
        const data = await res.json();
        setBusy(data.primary.busy);
        setLoading(false);
    }, [selectedDate]);


    const times = getSlots({
      calendarTimeZone: props.user.timeZone,
      selectedTimeZone: dayjs.tz.guess(),
      eventLength: props.eventType.length,
      selectedDate: selectedDate,
      dayStartTime: props.user.startTime,
      dayEndTime: props.user.endTime,
    })

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
      });
    }

    // Display available times
    const availableTimes = times.map((time) =>
        <div key={dayjs(time).utc().format()}>
            <Link href={`/${props.user.username}/book?date=${dayjs(time).utc().format()}&type=${props.eventType.id}`}>
                <a key={dayjs(time).format("hh:mma")} className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">{dayjs(time).tz(dayjs.tz.guess()).format("hh:mma")}</a>
            </Link>
        </div>
    );

    return (
        <div>
            <Head>
                <title>{props.eventType.title} | {props.user.name || props.user.username} | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={"mx-auto my-24 transition-max-width ease-in-out duration-500 " + (selectedDate ? 'max-w-6xl' : 'max-w-3xl')}>
                <div className="bg-white overflow-hidden shadow rounded-lg md:max-h-96">
                    <div className="sm:flex px-4 py-5 sm:p-6">
                        <div className={"sm:border-r " + (selectedDate ? 'sm:w-1/3' : 'sm:w-1/2')}>
                            {props.user.avatar && <img src={props.user.avatar} alt="Avatar" className="w-16 h-16 rounded-full mb-4"/>}
                            <h2 className="font-medium text-gray-500">{props.user.name}</h2>
                            <h1 className="text-3xl font-semibold text-gray-800 mb-4">{props.eventType.title}</h1>
                            <p className="text-gray-500 mb-4">
                                <svg className="inline-block w-4 h-4 mr-1 -mt-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {props.eventType.length} minutes
                            </p>
                            <p className="text-gray-600">{props.eventType.description}</p>
                        </div>
                        <div className={"mt-8 sm:mt-0 " + (selectedDate ? 'sm:w-1/3 border-r sm:px-4' : 'sm:w-1/2 sm:pl-4')}>
                            <div className="flex text-gray-600 font-light text-xl mb-4 ml-2">
                                <span className="w-1/2">{dayjs().month(selectedMonth).format("MMMM YYYY")}</span>
                                <div className="w-1/2 text-right">
                                    <button onClick={decrementMonth} className={"mr-4 " + (selectedMonth < dayjs().format('MM') && 'text-gray-400')} disabled={selectedMonth < dayjs().format('MM')}>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button onClick={incrementMonth}>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-y-4 text-center">
                                {calendar}
                            </div>
                        </div>
                        {selectedDate && <div className="sm:pl-4 mt-8 sm:mt-0 text-center sm:w-1/3 md:max-h-96 overflow-y-scroll">
                            <div className="text-gray-600 font-light text-xl mb-4 text-left">
                                <span className="w-1/2">{dayjs(selectedDate).format("dddd DD MMMM YYYY")}</span>
                            </div>
                            {!loading ? availableTimes : <div className="loader"></div>}
                        </div>}
                    </div>
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
            username: true,
            name: true,
            bio: true,
            avatar: true,
            eventTypes: true,
            startTime: true,
            timeZone: true,
            endTime: true
        }
    });

    const eventType = await prisma.eventType.findUnique({
        where: {
          id: parseInt(context.query.type),
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
            eventType
        },
    }
}
