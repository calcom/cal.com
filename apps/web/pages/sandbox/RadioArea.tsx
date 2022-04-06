import Head from "next/head";
import React, { useState } from "react";

import * as RadioArea from "@components/ui/form/radio-area";

const selectOptions = [
  {
    value: "rabbit",
    label: "Rabbit",
    description: "Fast and hard.",
  },
  {
    value: "turtle",
    label: "Turtle",
    description: "Slow and steady.",
  },
];

export default function RadioAreaPage() {
  const [formData, setFormData] = useState({});

  return (
    <>
      <Head>
        <meta name="googlebot" content="noindex" />
      </Head>
      <div className="w-full p-4">
        <h1 className="mb-4 text-4xl">RadioArea component</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="mb-2 space-y-4">
          <RadioArea.Group
            onChange={(radioGroup_1: string) => setFormData({ ...formData, radioGroup_1 })}
            className="flex max-w-screen-md space-x-4 rtl:space-x-reverse"
            name="radioGroup_1">
            <RadioArea.Item value="radioGroup_1_radio_1" className="flex-grow bg-white">
              <strong className="mb-1">radioGroup_1_radio_1</strong>
              <p>Description #1</p>
            </RadioArea.Item>
            <RadioArea.Item value="radioGroup_1_radio_2" className="flex-grow bg-white">
              <strong className="mb-1">radioGroup_1_radio_2</strong>
              <p>Description #2</p>
            </RadioArea.Item>
            <RadioArea.Item value="radioGroup_1_radio_3" className="flex-grow bg-white">
              <strong className="mb-1">radioGroup_1_radio_3</strong>
              <p>Description #3</p>
            </RadioArea.Item>
          </RadioArea.Group>
          <RadioArea.Group
            onChange={(radioGroup_2: string) => setFormData({ ...formData, radioGroup_2 })}
            className="flex max-w-screen-md space-x-4 rtl:space-x-reverse"
            name="radioGroup_2">
            <RadioArea.Item value="radioGroup_2_radio_1" className="flex-grow bg-white">
              <strong className="mb-1">radioGroup_1_radio_1</strong>
              <p>Description #1</p>
            </RadioArea.Item>
            <RadioArea.Item value="radioGroup_2_radio_2" className="flex-grow bg-white" defaultChecked={true}>
              <strong className="mb-1">radioGroup_1_radio_2</strong>
              <p>Description #2</p>
            </RadioArea.Item>
            <RadioArea.Item value="radioGroup_2_radio_3" className="flex-grow bg-white">
              <strong className="mb-1">radioGroup_1_radio_3</strong>
              <p>Description #3</p>
            </RadioArea.Item>
          </RadioArea.Group>
          <div>
            <p className="text-lg">Disabled RadioAreaSelect</p>
            <RadioArea.Select options={[]} className="max-w-screen-md" />
          </div>
          <div>
            <p className="text-lg">RadioArea disabled with custom placeholder</p>
            <RadioArea.Select
              className="max-w-screen-md"
              options={[]}
              placeholder="Does the rabbit or the turtle win the race?"></RadioArea.Select>
          </div>
          <div>
            <p className="text-lg">RadioArea with options</p>
            <RadioArea.Select
              className="max-w-screen-md"
              name="turtleOrRabbitWinsTheRace"
              onChange={(turtleOrRabbitWinsTheRace: string) =>
                setFormData({ ...formData, turtleOrRabbitWinsTheRace })
              }
              options={selectOptions}
              placeholder="Does the rabbit or the turtle win the race?"></RadioArea.Select>
          </div>

          <div>
            <p className="text-lg">RadioArea with default selected (disabled for clarity)</p>
            <RadioArea.Select
              disabled={true}
              className="max-w-screen-md"
              value="turtle"
              options={selectOptions}></RadioArea.Select>
          </div>
        </form>
        <pre>{JSON.stringify(formData)}</pre>
      </div>
    </>
  );
}
