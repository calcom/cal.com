import { FC, useEffect, useState } from "react";

import useTheme from "@calcom/lib/hooks/useTheme";
import { ITimezoneOption, TimezoneSelect } from "@calcom/ui";

import useMeQuery from "@lib/hooks/useMeQuery";

import { timeZone } from "../../lib/clock";

type Props = {
  onSelectTimeZone: (selectedTimeZone: string) => void;
};

const TimeOptions: FC<Props> = ({ onSelectTimeZone }) => {
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const query = useMeQuery();
  const userTheme = useTheme(query?.data?.theme).resolvedTheme;

  useEffect(() => {
    setSelectedTimeZone(timeZone());
  }, []);

  useEffect(() => {
    if (selectedTimeZone && timeZone() && selectedTimeZone !== timeZone()) {
      onSelectTimeZone(timeZone(selectedTimeZone));
    }
  }, [selectedTimeZone, onSelectTimeZone]);

  const customStyles = {
    option: (_provided: object, state: { isSelected: boolean; isFocused: boolean }) => ({
      padding: "10px 12px !important",
      color: state.isSelected || state.isFocused ? "#101010" : "#374151",
      backgroundColor: state.isSelected ? "#E5E7EB !important" : "white",
      ...(userTheme === "dark" && {
        color: state.isSelected || state.isFocused ? "white" : "#80868B",
      }),
    }),
    control: () => ({
      display: "flex",
      cursor: "pointer",
      backgroundColor: "transparent !important",
      minWidth: "5rem",
      height: "24px",
      minHeight: "24px !important",
      boxShadow: "none !important",
    }),
    singleValue: (provided: object, state: { selectProps: { menuIsOpen: boolean } }) => ({
      ...provided,
      color: state.selectProps.menuIsOpen ? "#111827" : "#4B5563",
      ...(userTheme === "dark" && {
        color: "#a5a5a5 !important",
      }),
    }),
    menu: (provided: object) => ({
      ...provided,
      minWidth: "20rem",
      margin: "8px 0 0 -20px",
    }),
    valueContainer: (provided: object) => ({
      ...provided,
      padding: "0 0 0 6px",
    }),
    dropdownIndicator: (provided: object, state: { selectProps: { menuIsOpen: boolean } }) => ({
      ...provided,
      transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "",
      color: state.selectProps.menuIsOpen ? "#111827" : "#4B5563",
      marginLeft: 4,
      padding: 0,
      ...(userTheme === "dark" && {
        color: "#80868B",
      }),
    }),
  };

  return !!selectedTimeZone ? (
    <TimezoneSelect
      id="timeZone"
      value={selectedTimeZone}
      onChange={(tz: ITimezoneOption) => setSelectedTimeZone(tz.value)}
      className="flex h-6 text-sm font-medium"
      styles={customStyles}
    />
  ) : null;
};

export default TimeOptions;
