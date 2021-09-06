import Link from "next/link";
import prisma from "@lib/prisma";
import Modal from "@components/Modal";
import Shell from "@components/Shell";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { useSession } from "next-auth/client";
import { ClockIcon } from "@heroicons/react/outline";
import Loader from "@components/Loader";
import { getSession } from "@lib/auth";

export default function Availability(props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [session, loading] = useSession();
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [showChangeTimesModal, setShowChangeTimesModal] = useState(false);
  const titleRef = useRef<HTMLInputElement>();
  const slugRef = useRef<HTMLInputElement>();
  const descriptionRef = useRef<HTMLTextAreaElement>();
  const lengthRef = useRef<HTMLInputElement>();
  const isHiddenRef = useRef<HTMLInputElement>();

  const startHoursRef = useRef<HTMLInputElement>();
  const startMinsRef = useRef<HTMLInputElement>();
  const endHoursRef = useRef<HTMLInputElement>();
  const endMinsRef = useRef<HTMLInputElement>();
  const bufferHoursRef = useRef<HTMLInputElement>();
  const bufferMinsRef = useRef<HTMLInputElement>();

  if (loading) {
    return <Loader />;
  }

  function toggleAddModal() {
    setShowAddModal(!showAddModal);
  }

  function toggleChangeTimesModal() {
    setShowChangeTimesModal(!showChangeTimesModal);
  }

  const closeSuccessModal = () => {
    setSuccessModalOpen(false);
    router.replace(router.asPath);
  };

  function convertMinsToHrsMins(mins) {
    let h = Math.floor(mins / 60);
    let m = mins % 60;
    h = h < 10 ? "0" + h : h;
    m = m < 10 ? "0" + m : m;
    return `${h}:${m}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function createEventTypeHandler(event) {
    event.preventDefault();

    const enteredTitle = titleRef.current.value;
    const enteredSlug = slugRef.current.value;
    const enteredDescription = descriptionRef.current.value;
    const enteredLength = lengthRef.current.value;
    const enteredIsHidden = isHiddenRef.current.checked;

    // TODO: Add validation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response = await fetch("/api/availability/eventtype", {
      method: "POST",
      body: JSON.stringify({
        title: enteredTitle,
        slug: enteredSlug,
        description: enteredDescription,
        length: enteredLength,
        hidden: enteredIsHidden,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (enteredTitle && enteredLength) {
      router.replace(router.asPath);
      toggleAddModal();
    }
  }

  async function updateStartEndTimesHandler(event) {
    event.preventDefault();

    const enteredStartHours = parseInt(startHoursRef.current.value);
    const enteredStartMins = parseInt(startMinsRef.current.value);
    const enteredEndHours = parseInt(endHoursRef.current.value);
    const enteredEndMins = parseInt(endMinsRef.current.value);
    const enteredBufferHours = parseInt(bufferHoursRef.current.value);
    const enteredBufferMins = parseInt(bufferMinsRef.current.value);

    const startMins = enteredStartHours * 60 + enteredStartMins;
    const endMins = enteredEndHours * 60 + enteredEndMins;
    const bufferMins = enteredBufferHours * 60 + enteredBufferMins;

    // TODO: Add validation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response = await fetch("/api/availability/day", {
      method: "PATCH",
      body: JSON.stringify({ start: startMins, end: endMins, buffer: bufferMins }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    setShowChangeTimesModal(false);
    setSuccessModalOpen(true);
  }

  return (
    <div>
      <Shell heading="Availability" subtitle="Configure times when you are available for bookings.">
        <div className="flex">
          <div className="w-1/2 mr-2 bg-white border border-gray-200 rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Change the start and end times of your day
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  Currently, your day is set to start at {convertMinsToHrsMins(props.user.startTime)} and end
                  at {convertMinsToHrsMins(props.user.endTime)}.
                </p>
              </div>
              <div className="mt-5">
                <button onClick={toggleChangeTimesModal} type="button" className="btn btn-primary">
                  Change available times
                </button>
              </div>
            </div>
          </div>

          <div className="w-1/2 ml-2 border border-gray-200 rounded-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Something doesn&apos;t look right?
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Troubleshoot your availability to explore why your times are showing as they are.</p>
              </div>
              <div className="mt-5">
                <Link href="/availability/troubleshoot">
                  <a className="btn btn-white">Launch troubleshooter</a>
                </Link>
              </div>
            </div>
          </div>
        </div>
        {showChangeTimesModal && (
          <div
            className="fixed z-50 inset-0 overflow-y-auto"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="fixed inset-0 bg-gray-500 z-0 bg-opacity-75 transition-opacity"
                aria-hidden="true"></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-sm px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div className="sm:flex sm:items-start mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-neutral-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ClockIcon className="h-6 w-6 text-neutral-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Change your available times
                    </h3>
                    <div>
                      <p className="text-sm text-gray-500">
                        Set the start and end time of your day and a minimum buffer between your meetings.
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={updateStartEndTimesHandler}>
                  <div className="flex mb-4">
                    <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">Start time</label>
                    <div>
                      <label htmlFor="hours" className="sr-only">
                        Hours
                      </label>
                      <input
                        ref={startHoursRef}
                        type="number"
                        name="hours"
                        id="hours"
                        className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                        placeholder="9"
                        defaultValue={convertMinsToHrsMins(props.user.startTime).split(":")[0]}
                      />
                    </div>
                    <span className="mx-2 pt-1">:</span>
                    <div>
                      <label htmlFor="minutes" className="sr-only">
                        Minutes
                      </label>
                      <input
                        ref={startMinsRef}
                        type="number"
                        name="minutes"
                        id="minutes"
                        className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                        placeholder="30"
                        defaultValue={convertMinsToHrsMins(props.user.startTime).split(":")[1]}
                      />
                    </div>
                  </div>
                  <div className="flex mb-4">
                    <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">End time</label>
                    <div>
                      <label htmlFor="hours" className="sr-only">
                        Hours
                      </label>
                      <input
                        ref={endHoursRef}
                        type="number"
                        name="hours"
                        id="hours"
                        className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                        placeholder="17"
                        defaultValue={convertMinsToHrsMins(props.user.endTime).split(":")[0]}
                      />
                    </div>
                    <span className="mx-2 pt-1">:</span>
                    <div>
                      <label htmlFor="minutes" className="sr-only">
                        Minutes
                      </label>
                      <input
                        ref={endMinsRef}
                        type="number"
                        name="minutes"
                        id="minutes"
                        className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                        placeholder="30"
                        defaultValue={convertMinsToHrsMins(props.user.endTime).split(":")[1]}
                      />
                    </div>
                  </div>
                  <div className="flex mb-4">
                    <label className="w-1/4 pt-2 block text-sm font-medium text-gray-700">Buffer</label>
                    <div>
                      <label htmlFor="hours" className="sr-only">
                        Hours
                      </label>
                      <input
                        ref={bufferHoursRef}
                        type="number"
                        name="hours"
                        id="hours"
                        className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                        placeholder="0"
                        defaultValue={convertMinsToHrsMins(props.user.bufferTime).split(":")[0]}
                      />
                    </div>
                    <span className="mx-2 pt-1">:</span>
                    <div>
                      <label htmlFor="minutes" className="sr-only">
                        Minutes
                      </label>
                      <input
                        ref={bufferMinsRef}
                        type="number"
                        name="minutes"
                        id="minutes"
                        className="shadow-sm focus:ring-neutral-500 focus:border-neutral-500 block w-full sm:text-sm border-gray-300 rounded-sm"
                        placeholder="10"
                        defaultValue={convertMinsToHrsMins(props.user.bufferTime).split(":")[1]}
                      />
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="btn btn-primary">
                      Update
                    </button>
                    <button onClick={toggleChangeTimesModal} type="button" className="btn btn-white mr-2">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        <Modal
          heading="Start and end times changed"
          description="The start and end times for your day have been changed successfully."
          open={successModalOpen}
          handleClose={closeSuccessModal}
        />
      </Shell>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { permanent: false, destination: "/auth/login" } };
  }

  const user = await prisma.user.findFirst({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      username: true,
      startTime: true,
      endTime: true,
      bufferTime: true,
    },
  });

  const types = await prisma.eventType.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      hidden: true,
    },
  });
  return {
    props: { user, types }, // will be passed to the page component as props
  };
}
