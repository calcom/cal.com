import { RadioAreaInput, RadioAreaInputGroup } from "@components/ui/form/RadioAreaInput";
import Head from "next/head";
import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { ChevronDownIcon } from "@heroicons/react/solid";

export default function RadioareaPage() {

  const [ formData, setFormData ] = useState({});

  const onSubmit = (e) => {
    e.preventDefault();
    setFormData(Object.fromEntries((new FormData(e.target)).entries()));
  };

  return (
    <>
      <Head>
        <meta name="googlebot" content="noindex" />
      </Head>
      <div className="w-full p-4">
        <h1 className="text-4xl mb-4">RadioArea component</h1>
        <form onSubmit={onSubmit}>
          <RadioAreaInputGroup onChange={(value: string) => setFormData({
            ...formData,
            radioGroup_1: value,
          })} className="flex space-x-4" name="radioGroup_1">
            <RadioAreaInput value="radioGroup_1_radio_1" defaultChecked={true}>
              <strong className="mb-1">radioGroup_1_radio_1</strong>
              <p>
                Description #1
              </p>
            </RadioAreaInput>
            <RadioAreaInput value="radioGroup_1_radio_2">
              <strong className="mb-1">radioGroup_1_radio_2</strong>
              <p>
                Description #2
              </p>
            </RadioAreaInput>
            <RadioAreaInput value="radioGroup_1_radio_3">
              <strong className="mb-1">radioGroup_1_radio_3</strong>
              <p>
                Description #3
              </p>
            </RadioAreaInput>
          </RadioAreaInputGroup>
          <p className="my-2">
            RadioArea collapsible example
          </p>
          <Collapsible className="max-w-screen-md">
            <CollapsibleTrigger as="div" className="mb-1 cursor-pointer border border-1 bg-white p-2 shadow-sm focus:ring-neutral-900 focus:border-neutral-900 block w-full sm:text-sm border-gray-300 rounded-sm">
              Does the rabbit or the turtle win the race?
              <ChevronDownIcon className="float-right h-5 w-5 text-neutral-500" />
            </CollapsibleTrigger>

            <CollapsibleContent className="border bg-white border-1 p-4">
              <RadioAreaInputGroup onChange={(value: string) => setFormData({
                ...formData,
                turtleOrRabbitWinsTheRace: value,
              })} className="space-y-2" name="turtleOrRabbitWinsTheRace">
                <RadioAreaInput value="rabbit" defaultChecked={true}>
                  <strong className="mb-1">Rabbit</strong>
                  <p>
                    Fast and hard
                  </p>
                </RadioAreaInput>
                <RadioAreaInput value="turtle">
                  <strong className="mb-1">Turtle</strong>
                  <p>
                    Slow and steady
                  </p>
                </RadioAreaInput>
              </RadioAreaInputGroup>
            </CollapsibleContent>
          </Collapsible>
          <button className="btn btn-primary my-2">View submission data</button>
        </form>
        <pre>
          {JSON.stringify(formData)}
        </pre>
      </div>
    </>
  );
}
