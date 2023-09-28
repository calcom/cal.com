import { cx } from "class-variance-authority";
import React from "react";

function formatDate(inputDate) {
  if (!inputDate) return;
  const [year, month] = inputDate.split("-");
  const date = new Date(year, month - 1);
  const options = { month: "short", year: "numeric" };
  const formattedDate = new Intl.DateTimeFormat("en-US", options).format(date);
  return formattedDate;
}

function ExperienceItem({ experience, className }) {
  // If there are multiple roles, show them in a list with dots
  // If there is only one role, show it as a single line with no dots and indentation
  let rolesRender;
  if (experience.roles?.length > 1) {
    rolesRender = experience.roles.map((role, index) => (
      <div key={index} className="flex flex-row items-stretch">
        <div className="mt-2 flex w-7 shrink-0 flex-col items-center justify-start gap-1">
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div
            className={cx(
              "-mb-3 w-px flex-grow bg-gray-100",
              index === experience.roles.length - 1 ? "hidden" : ""
            )}
          />
        </div>
        <div className="flex flex-col">
          <div>{role.title}</div>
          <div className="text-gray-400">
            {formatDate(role.start_date)} –{" "}
            {role.end_date === "Present" ? "Present" : formatDate(role.end_date)}
          </div>
        </div>
      </div>
    ));
  } else if (experience.roles?.length === 1) {
    const role = experience.roles[0];
    rolesRender = (
      <div className="flex flex-col">
        <div>{role.title}</div>
        <div className="text-gray-400">
          {formatDate(role.start_date)} –{" "}
          {role.end_date === "Present" ? "Present" : formatDate(role.end_date)}
        </div>
      </div>
    );
  } else {
    rolesRender = "";
  }

  return (
    <div className={cx("flex w-full flex-col ", className)}>
      <div className="self-start whitespace-nowrap  font-semibold">{experience.company}</div>
      <div className="flex flex-col gap-2">{rolesRender}</div>
    </div>
  );
}

export default ExperienceItem;
