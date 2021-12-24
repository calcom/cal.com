import dayjs from "dayjs";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import React from "react";
import { useMutation } from "react-query";

import { createPaymentLink } from "@ee/lib/stripe/client";

import { asStringOrNull, asStringOrThrow, asStringOrUndefined } from "@lib/asStringOrNull";
import { timeZone } from "@lib/clock";
import { useLocale } from "@lib/hooks/useLocale";
import { createBookingPac } from "@lib/mutations/bookings/create-booking";
import prisma from "@lib/prisma";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { inferSSRProps } from "@lib/types/inferSSRProps";

import SelfSchedulingHeader from "@components/autoscheduling/Header";
import Button from "@components/ui/Button";

import { sitesTranslation, TSite } from "../../../../../../common/mock/sites";
import { getSSBeneficiary } from "../../../../../../common/utils/localstorage";
import { availableServices } from "../../service";

export type TReviewPageProps = inferSSRProps<typeof getServerSideProps>;

export default function Review(props: TReviewPageProps) {
  const router = useRouter();
  const telemetry = useTelemetry();
  const { t, i18n } = useLocale();

  const beneficiary = getSSBeneficiary();

  const rescheduleUid = router.query.rescheduleUid as string;

  let service = "RG";
  const queryService = router.query.service;
  if (queryService && typeof queryService === "string") {
    service = availableServices.find((auxService) => auxService.id === queryService)?.name || "RG";
  }

  let site = "PAC";
  const querySite = router.query.slug;
  if (querySite && typeof queryService === "string") {
    site = sitesTranslation[querySite as TSite] || "PAC";
  }

  const date = asStringOrNull(router.query.time);

  const handleBack = () => {
    router.push({
      pathname: "/team/projects/pac/data",
      query: router.query,
    });
  };

  const mutation = useMutation(createBookingPac, {
    onSuccess: async ({ attendees, paymentUid, ...responseData }) => {
      if (paymentUid) {
        return await router.push(
          createPaymentLink({
            paymentUid,
            date,
            name: attendees[0].name,
            absolute: false,
          })
        );
      }

      const location = (function humanReadableLocation(location) {
        if (!location) {
          return;
        }
        if (location.includes("integration")) {
          return t("web_conferencing_details_to_follow");
        }
        return location;
      })(responseData.location);

      return router.push({
        pathname: "/success",
        query: {
          date,
          type: props.eventType.id,
          user: props.profile.slug,
          reschedule: !!rescheduleUid,
          name: attendees[0].name,
          email: attendees[0].email,
          location,
        },
      });
    },
  });

  const bookEvent = () => {
    const beneficiary = getSSBeneficiary();
    telemetry.withJitsu((jitsu) =>
      jitsu.track(telemetryEventTypes.bookingConfirmed, collectPageParameters())
    );

    // "metadata" is a reserved key to allow for connecting external users without relying on the email address.
    // <...url>&metadata[user_id]=123 will be send as a custom input field as the hidden type.
    const metadata = Object.keys(router.query)
      .filter((key) => key.startsWith("metadata"))
      .reduce(
        (metadata, key) => ({
          ...metadata,
          [key.substring("metadata[".length, key.length - 1)]: router.query[key],
        }),
        {}
      );

    const parsedSite = asStringOrUndefined(router.query.slug);
    const service = asStringOrUndefined(router.query.service);

    mutation.mutate({
      start: dayjs(date).format(),
      end: dayjs(date).add(props.eventType.length, "minute").format(),
      name: beneficiary?.name || "",
      email: beneficiary?.email || "",
      eventTypeId: props.eventType.id,
      timeZone: timeZone(),
      language: i18n.language,
      rescheduleUid,
      user: router.query.user,
      location: "default",
      metadata,
      customInputs: [
        { label: "CPF", value: beneficiary?.document || "" },
        { label: "PAC", value: parsedSite || "" },
        { label: "servico", value: service || "" },
        { label: "grupo", value: beneficiary?.group || "" },
      ],
    });
  };

  return (
    <div className="bg-gray-200 h-screen flex flex-col justify-between">
      <div className="p-4 bg-white">
        <SelfSchedulingHeader page="review" />
        <p className="mt-2 text-sm text-gray-500">
          Verifique suas informações pois erros podem influenciar na aprovação do seu agendamento.
        </p>
        <div className="mt-4 overflow-auto">
          <div className="border-y border-y-gray-100">
            <p className="text-gray-500 font-bold text-sm mt-4">Dados do beneficiário</p>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="font-bold pb-2 pt-4">Beneficiário</td>
                  <td className="pb-2 pt-4">{beneficiary?.name}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">E-mail</td>
                  <td className="py-2">{beneficiary?.email}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">CPF</td>
                  <td className="py-2">{beneficiary?.document}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Telefone</td>
                  <td className="py-2">{beneficiary?.phone}</td>
                </tr>
                <tr>
                  <td className="font-bold pt-2 pb-1">Grupo</td>
                  <td className="pt-2 pb-1">{beneficiary?.group}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-gray-500 font-bold text-sm mt-4">Solicitação</p>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="font-bold pb-2 pt-4">Serviço</td>
                  <td className="pb-2 pt-4">{service}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Local</td>
                  <td className="py-2">{site}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Data</td>
                  <td className="py-2">{dayjs(date).format("DD/MM/YYYY")}</td>
                </tr>
                <tr>
                  <td className="font-bold py-2">Horário</td>
                  <td className="py-2">{dayjs(date).format("HH:mm")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="min-h-24 bg-white py-2 px-4 drop-shadow-[0_-4px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-row w-full">
          <Button color="secondary" className="w-full justify-center" onClick={handleBack}>
            Editar
          </Button>
          <Button className="w-full ml-4 justify-center" onClick={bookEvent}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const eventTypeId = parseInt(asStringOrThrow(context.query.eventId));
  if (eventTypeId % 1 !== 0) {
    return {
      notFound: true,
    } as const;
  }

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: eventTypeId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      length: true,
      locations: true,
      customInputs: true,
      periodType: true,
      periodDays: true,
      periodStartDate: true,
      periodEndDate: true,
      periodCountCalendarDays: true,
      disableGuests: true,
      team: {
        select: {
          slug: true,
          name: true,
          logo: true,
        },
      },
      users: {
        select: {
          avatar: true,
          name: true,
        },
      },
    },
  });

  if (!eventType) return { notFound: true };

  const eventTypeObject = [eventType].map((e) => {
    return {
      ...e,
      periodStartDate: e.periodStartDate?.toString() ?? null,
      periodEndDate: e.periodEndDate?.toString() ?? null,
    };
  })[0];

  let booking = null;

  if (context.query.rescheduleUid) {
    booking = await prisma.booking.findFirst({
      where: {
        uid: asStringOrThrow(context.query.rescheduleUid),
      },
      select: {
        description: true,
        attendees: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });
  }

  return {
    props: {
      profile: {
        ...eventTypeObject.team,
        slug: "team/" + eventTypeObject.slug,
        image: eventTypeObject.team?.logo || null,
        theme: null /* Teams don't have a theme, and `BookingPage` uses it */,
      },
      eventType: eventTypeObject,
      booking,
    },
  };
}
