import { useState } from "react"
import { HTTPResponseCodes } from "@utils/http"
import { Tabs, Tab } from "@components/uicomp/tabbar"
import { ChevronRight } from "@components/icons-alt/chevron-right"
import cn from "classnames"

export const getColorClassName = (method) => {
  switch (method) {
    case "GET": return "bg-green-100 text-green-600"
    case "HEAD": return "bg-fuchsia-100 text-fuchsia-600"
    case "POST": return "bg-sky-100 text-sky-600"
    case "PUT": return "bg-amber-100 text-amber-600"
    case "DELETE": return "bg-rose-100 text-rose-600"
    case "CONNECT": return "bg-violet-100 text-violet-600"
    case "OPTIONS": return "bg-neutral-100 text-neutral-600"
    case "TRACE": return "bg-indigo-100 text-indigo-600"
    case "PATCH": return "bg-orange-100 text-orange-600"
  }
}

export const getResponseColorClassName = (code) => {
  if (code < 300) {
    return "bg-green-500"
  } else if (code < 400) {
    return "bg-orange-500"
  } else {
    return "bg-rose-500"
  }
}

export const ResponseTag = ({ code }) => {
  return <div className="not-prose flex flex-row gap-2 items-center whitespace-nowrap">
      <div className={`${getResponseColorClassName(code)} rounded-full w-2 h-2 flex-none`}/>
      <p className="font-medium">{code}: {HTTPResponseCodes[code]}</p>
    </div>
}

export const Badge = ({ method }) => {
  return <span className={`${getColorClassName(method)} font-medium rounded-full px-2 py-1 text-xs w-min select-none`}>{ method }</span>
}

export const ObjectTypeFormatter = ({ typeinfo }) => {
  return <div className="mt-4 overflow-x-auto flex flex-col gap-2 divide-y divide-neutral-100">
    {typeinfo && Object.keys(typeinfo).map(k => {
      let example
      if (typeof typeinfo[k]?.example === "object") {
        example = <div>
            <p className="mb-2">Example:</p>
            <div className="bg-neutral-50 p-2 rounded-md font-mono text-xs whitespace-pre-wrap">
              {JSON.stringify(typeinfo[k]?.example, null, 2)}</div>
          </div>
      } else {
        example = <p className="mb-2">
            Example:
            <span className="font-mono ml-1 text-xs">{typeinfo[k]?.example}</span>
          </p>
      }
      return <div>
          <div className="py-2">
            <span className="font-mono text-xs">{ k }</span>
            <span className="ml-1 font-semibold">{ typeinfo[k]?.type }</span>
          </div>
          {typeinfo[k]?.example && <div>
              {example}
              </div>
          }
        </div>
    })}
  </div>
}

export const TypeFormatter = ({ type, typeinfo }) => {
  const [isOpen, setOpen] = useState(false)

  if (type === "array") {
    let description
    if (typeinfo?.type === "object") {
      description = <>
          <div className="-mb-2">
            Each item is an <span className="font-semibold">object</span> with fields:
          </div>
          <ObjectTypeFormatter typeinfo={typeinfo.properties} />
        </>
    } else if (typeinfo) {
      description = <>
          <div>
            Each item is of type{' '}
            <span className="font-semibold">{typeinfo.type}</span>.
          </div>
          {
            typeinfo.enum && <p className="block">
                Accepted values:{' '}
                <span className="font-mono text-xs block whitespace-normal">{JSON.stringify(typeinfo.enum.join(", "))}</span>
              </p>
          }
        </>
    }
    return <div>
        <div className="w-min flex flex-row items-center cursor-pointer hover:opacity-80" onClick={() => setOpen(o => !o)}>
          <p className="font-semibold">array</p>
          { description &&
            <div className="flex flex-row items-center whitespace-nowrap mt-0.5 ml-2 text-xs border rounded-full px-2 bg-neutral-50 text-neutral-500 transition">
              { isOpen ? "Hide items" : "Show items"}
            </div>
          }
        </div>
        { isOpen && <div>
          <div className="mt-4">
            { description }
          </div>
        </div>}
      </div>
  } else if (type === "object") {
    return <div>
        <div className="w-min flex flex-row items-center cursor-pointer hover:opacity-80" onClick={() => setOpen(o => !o)}>
          <p className="font-semibold">object</p>
          { typeinfo &&
            <div className="flex flex-row items-center whitespace-nowrap mt-0.5 ml-2 text-xs border rounded-full px-2 bg-neutral-50 text-neutral-500 transition">
              { isOpen ? "Hide fields" : "Show fields"}
            </div>
          }
        </div>
        { isOpen && <ObjectTypeFormatter typeinfo={typeinfo} />}
      </div>
  }
  return <p className="font-semibold">{ type }</p>
}

export const ParamsTable = ({ params }) => {

  return <table className="w-full text-sm table-auto prose border-collapse min-w-full m-0">
      <tbody>
        { params.map(p => {
          return <tr className="border-b border-neutral-100">
              <td className="w-48 py-2 font-mono align-top text-sm">
                {p.name}{p.required && <span className="text-rose-500 text-xs ml-0.5 transform -translate-y-1 inline-block select-none">*</span>}
              </td>
              {p.type &&
                <td className="w-48 py-2 align-top max-w-[200px] overflow-x-auto">
                  <TypeFormatter type={p.type} typeinfo={p.typeinfo} />
                </td>
              }
              {p.description &&
                <td className="py-2 align-top">
                  {p.description}
                </td>
              }
            </tr>
        })}
      </tbody>
    </table>
}

export const getRequestBodyExample = (props) => {
  const example = Object.keys(props).reduce((acc, value) => {
    return {
      ...acc,
      [value]: props[value]?.example
    }
  }, {})
  if (Object.values(example).filter(Boolean).length === 0) {
    return undefined
  }
  return JSON.stringify(example, null, 2)
}

export const getRequestBodySchema = (props) => {
  const required = props.required || []
  const properties = props.properties || {}
  return Object.keys(properties).reduce((acc, value) => {
    const type = properties[value].type
    let typeinfo = undefined
    if (type === 'array') {
      typeinfo = properties[value].items
    } else if (type === 'object') {
      typeinfo = properties[value].properties
    }
    return [
      ...acc,
      {
        name: value,
        required: required.includes(value),
        type,
        typeinfo,
        description: properties[value].description?.replace("\n", "<br />")
      }]
  }, [])
}

export const RequestBody = ({ requestBody }) => {
  const props = requestBody?.content?.["application/json"]?.schema
  const examples = requestBody?.content?.["application/json"]?.examples
  if (!props) {
    return <p className="text-neutral-500">No request body.</p>
  }
  const exampleTabs = examples ? Object.entries(examples).map(([key, value], index) => (
    <Tab key={key} title={`Example${Object.keys(examples).length > 1 ? ` ${index + 1}` : ""}`}>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </Tab>
  )) : null;

  //const example = getRequestBodyExample(props?.properties)
  return <Tabs>
      <Tab title="Schema" className="pt-4">
        <ParamsTable params={getRequestBodySchema(props)} />
      </Tab>
      {exampleTabs}
    </Tabs>
}

export const RevealButton = ({ open, className, onClick }) => {
  return <div onClick={onClick} className={`${className} p-1 rounded-md hover:bg-neutral-100 transition cursor-pointer`}><ChevronRight className={cn(
      "w-6 h-6 text-neutral-600 transform transition", {
        "rotate-0": !open,
        "rotate-90": open,
      }
    )} /></div>
}

export const getResponseBodyExample = (responseObj, code) => {
  // Check if the response object is provided
  if (!responseObj) return null;
  // Find the first response with a status code starting with '2' (success)
  //console.log("resp", responseObj, code);
  const successStatusCode = code.startsWith('2');
  // If no success status code is found, return null
  if (!successStatusCode) return null;
  // Extract the content object from the response
  const contentObj = responseObj.content;
  // If the content object is not provided or is empty, return null
  if (!contentObj || Object.keys(contentObj).length === 0) return null;
  // Get the first available content type (e.g. 'application/json')
  const contentType = Object.keys(contentObj)[0];

  // Check if examples are provided directly within the content object
  if (contentObj[contentType]?.examples) {
    // Get the first example key (e.g. 'bookings')
    const exampleKey = Object.keys(contentObj[contentType].examples)[0];
    // Return the value of the example
    return contentObj[contentType].examples[exampleKey]?.value || null;
  }
  // If no direct examples are found, check if an example is provided within a schema object
  else if (contentObj[contentType]?.schema?.example) {
    // Return the value of the example within the schema
    return contentObj[contentType].schema.example;
  }
  // If no examples are found, return null
  else {
    return null;
  }
}


export const HTTPAPIDoc = ({ method, baseUrl, path, description, parameters, responses, requestBody, isOpen: _isOpen }) => {
  const [isOpen, setOpen] = useState(_isOpen)
  const queryParams = parameters?.filter(p => p.in === "query")
  const pathParams = parameters?.filter(p => p.in === "path")
  const formDataParams = parameters?.filter(p => p.in === "formData")
  const bodyParams = parameters?.filter(p => p.in === "body")
  // console.log("body params", bodyParams)

  return <div className="pl-12 pr-6 pt-4 pb-4 rounded-md bg-white border border-neutral-200 flex flex-col gap-2 overflow-hidden not-prose">
    <div className="relative flex flex-row gap-4 items-center m-0 not-prose">
      <RevealButton
        className="absolute left-[-38px]"
        open={isOpen}
        onClick={() => setOpen(o => !o)}
      />
      <Badge method={method} />
      <p className="text-sm"><span className="text-neutral-400">{baseUrl || ''}</span><span className="font-medium text-neutral-900">{path || ''}</span>
      </p>
    </div>
    <p className="m-0 p-0 mt-2">{description}</p>
    { isOpen && <>
      <div>
        <p className="font-semibold mt-4">Parameters</p>
        {!(parameters?.length > 0) && <p className="text-neutral-500">No parameters</p>}
        {queryParams?.length > 0 && <>
            <p className="font-semibold mt-10 text-sm">Query</p>
            <ParamsTable params={queryParams} />
          </>
        }
        {pathParams?.length > 0 && <>
            <p className="font-semibold mt-10 text-sm">Path</p>
            <ParamsTable params={pathParams} />
          </>
        }
        {bodyParams?.length > 0 && <>
            <p className="font-semibold mt-10 text-sm">Body</p>
            <ParamsTable params={bodyParams} />
          </>
        }
        {formDataParams?.length > 0 && <>
            <p className="font-semibold mt-10 text-sm">Form data</p>
            <ParamsTable params={formDataParams} />
          </>
        }
      </div>
      {requestBody && Object.keys(requestBody)?.length > 0 &&
        <>
          <p className="font-semibold mt-10 text-sm">Body</p>
          <RequestBody requestBody={requestBody} />
        </>
      }
      {responses && Object.keys(responses)?.length > 0 && (
        <>
          <p className="font-semibold mt-4 m-0 p-0">Responses</p>
          <table className="w-full text-sm prose border-collapse min-w-full m-0 table-fixed">
            <tbody>
              {Object.keys(responses).map((code) => {
                const responseBody = responses[code];
                const example = getResponseBodyExample(responseBody, code);
                return (
                  <tr className="border-b border-neutral-100" key={code}>
                    <td className="w-48 py-2 align-top pr-2">
                      <ResponseTag code={code} />
                    </td>
                    <td className="py-2 align-top pr-2">
                      <p
                        dangerouslySetInnerHTML={{
                          __html: responseBody.description?.replace(/\n/gi, ''),
                        }}
                      />
                      {example && (
                        <div className="mt-4 overflow-x-auto">
                          <h4>Example</h4>
                          <pre className="w-full overflow-x-auto">{JSON.stringify(example, null, 2)}</pre>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      </>
    }
  </div>
}

<div className="prose p-8 max-w-full">
<HTTPAPIDoc
  isOpen
  method="POST"
  baseUrl="http://api.example.com"
  path="/greet"
  description="Greet the user."
  responses={{
    "200":{
      "description":"Booking(s) created successfully.",
      "content":{
         "application/json":{
            "examples":{
               "bookings":{
                  "value":{
                     "id":11223344,
                     "uid":"5yUjmAYTDF6MXo98re8SkX",
                     "userId":123,
                     "eventTypeId":2323232,
                     "title":"Debugging between Syed Ali Shahbaz and Hello Hello",
                     "description":null,
                     "customInputs":{

                     },
                     "responses":null,
                     "startTime":"2023-05-24T13:00:00.000Z",
                     "endTime":"2023-05-24T13:30:00.000Z",
                     "location":"Calcom HQ",
                     "createdAt":"2023-04-19T10:17:58.580Z",
                     "updatedAt":null,
                     "status":"PENDING",
                     "paid":false,
                     "destinationCalendarId":2180,
                     "cancellationReason":null,
                     "rejectionReason":null,
                     "dynamicEventSlugRef":null,
                     "dynamicGroupSlugRef":null,
                     "rescheduled":null,
                     "fromReschedule":null,
                     "recurringEventId":null,
                     "smsReminderNumber":null,
                     "scheduledJobs":[

                     ],
                     "metadata":{

                     },
                     "isRecorded":false,
                     "user":{
                        "email":"test@cal.com",
                        "name":"Syed Ali Shahbaz",
                        "timeZone":"Asia/Calcutta"
                     },
                     "attendees":[
                        {
                           "id":12345,
                           "email":"hello@gmail.com",
                           "name":"Hello Hello",
                           "timeZone":"Europe/London",
                           "locale":"en",
                           "bookingId":11223344
                        }
                     ],
                     "payment":[

                     ],
                     "references":[

                     ]
                  }
               }
            }
         }
      }
   },
    "404": { "description": "Pet not found" },
    "405": { "description": "Bad request\n<table>\n  <tr>\n    <td>Message</td>\n    <td>Cause</td>\n  </tr>\n  <tr>\n    <td>Booking body is invalid</td>\n    <td>Missing property on booking entity.</td>\n  </tr>\n  <tr>\n    <td>Invalid eventTypeId</td>\n    <td>The provided eventTypeId does not exist.</td>\n  </tr>\n  <tr>\n    <td>Missing recurringCount</td>\n    <td>The eventType is recurring, and no recurringCount was passed.</td>\n  </tr>\n  <tr>\n    <td>Invalid recurringCount</td>\n    <td>The provided recurringCount is greater than the eventType recurring config</td>\n  </tr>\n</table>\n" }
  }}
  requestBody={{
    "description": "Create a new attendee related to one of your bookings",
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "type": "object",
          "required": ["bookingId", "name", "email"],
          "properties": {
            "bookingId": { "type": "number", "example": 1, "description": "The booking id" },
            "email": { "type": "string", "example": "email@example.com" },
            "name": { "type": "string", "example": "John Doe" },
            "timeZone": { "type": "string", "example": "Europe/London" },
            "attendees": {
              "type": "array",
              "description": "List of attendees of the booking",
              "items": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "email": { "type": "string", "format": "email" },
                  "timeZone": { "type": "string" },
                  "locale": { "type": "string" }
                }
              }
            },
            "days": {
              "type": "array",
              "description": "Array of integers depicting weekdays",
              "items": { "type": "integer", "enum": [0, 1, 2, 3, 4, 5] }
            },
            "schema": {
              "type": "object",
              "required": ["title", "slug", "length", "metadata"],
              "properties": {
                "length": { "type": "number", "example": 30 },
                "metadata": {
                  "type": "object",
                  "example": {
                    "smartContractAddress": "0x1234567890123456789012345678901234567890"
                  }
                },
                "title": { "type": "string", "example": "My Event" },
                "slug": { "type": "string", "example": "my-event" }
              }
            }
          }
        },
        "examples":{
          "team-event-type":{"summary":"An example of a team event type POST request","value":{"title":"Tennis class","slug":"tennis-class-{{$guid}}","length":60,"hidden":false,"position":0,"teamId":3,"eventName":null,"timeZone":null,"periodType":"UNLIMITED","periodStartDate":null,"periodEndDate":null,"periodDays":null,"periodCountCalendarDays":null,"requiresConfirmation":true,"recurringEvent":{"interval":2,"count":10,"freq":2},"disableGuests":false,"hideCalendarNotes":false,"minimumBookingNotice":120,"beforeEventBuffer":0,"afterEventBuffer":0,"schedulingType":null,"price":0,"currency":"usd","slotInterval":null,"successRedirectUrl":null,"description":null,"locations":[{"address":"London","type":"inPerson"}],"metadata":{}}},
          "event-type":{"summary":"An example of a team event type POST request","value":{"title":"Tennis class","slug":"tennis-class-{{$guid}}","length":60,"hidden":false,"position":0,"teamId":3,"eventName":null,"timeZone":null,"periodType":"UNLIMITED","periodStartDate":null,"periodEndDate":null,"periodDays":null,"periodCountCalendarDays":null,"requiresConfirmation":true,"recurringEvent":{"interval":2,"count":10,"freq":2},"disableGuests":false,"hideCalendarNotes":false,"minimumBookingNotice":120,"beforeEventBuffer":0,"afterEventBuffer":0,"schedulingType":null,"price":0,"currency":"usd","slotInterval":null,"successRedirectUrl":null,"description":null,"locations":[{"address":"London","type":"inPerson"}],"metadata":{}}}
        }
      }
    }
  }}
/>
</div>