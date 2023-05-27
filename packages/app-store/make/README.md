# Setting up Make Integration

1. Create a [Make account](), if you don't have one.
2. Go to `Scenarios` in the sidebar and click on **Create a new scenario**
3. Search for `Cal.com` in the apps list and select from the list of triggers - Booking Created, Booking Deleted, Booking Rescheduled, Meeting Ended.


### Notes on building an integration (custom app for Make.com)


(This is just to document the procedure of building the integration. Can be removed from README later if not relevant.)
1. Create a [Make.com]() account.
2. Once signed in, at the bottom of the left sidebar, go to `Profile`. Select the `API` tab and click on `Add Token`. Pick a name of the token and choose `Select All` for scopes. Here's the official documentation for [Generating a Make.com authentication token](https://www.make.com/en/api-documentation/authentication-token) that is needed to access the API.
3. Copy the auth token that is generated.
4. Go to `/settings/admin/apps` in your local Calcom instance, select `Make` under `automation` and enable it.
5. If using VSCode, install the [Make Apps SDK extension](https://marketplace.visualstudio.com/items?itemName=Integromat.apps-sdk) and follow the steps [here](https://docs.integromat.com/apps/apps-sdk/configuration-of-vs-code) to setup your extension. (If you run into errors, follow [this thread](https://community.make.com/t/updated-vs-code-documentation/7600/2) to setup VSCode settings manually.)
6. Once VScode is setup, click on the Make extension icon in the left sidebar. If no apps show under the `OPENSOURCE APPS` section in the extension, reload VSCode.
7. In the `MY APPS` section of the extension, click on the `+` sign to create a new app and go through prompts. After a few seconds, you should be able to see your new app on the extension. There are a number of directories within the app - `General`, `Connections`, `Webhooks` etc. Once this is done, your new app also shows up in the `MY APPS` section (go to `/apps?tab=myapps`) in the left sidebar in your account on the Make.com platform. The steps below from <> to <> can be performed in the VSCode Make integration or in the web platform. As you make changes in VSCode, these should reflect in your app on the Make platform.
8. In the `General` directory in your app, select `Base`. This is in `json` format. Set the `baseUrl` in this file as `<Cal.com URL>/api/integrations/make`. Use `ngrok` for local development, since Make [recommends using `HTTPS` requests](https://www.make.com/en/api-documentation/api-structure).
9. Set `apiKey` in the query params. We're using a variable for the `baseUrl` to allow testing on local as well as on Cal.com. The `Base` file looks like this:
```json
{
    "baseUrl": "{{connection.calDeploymentUrl}}",
    "qs": {
        "api_key": "{{connection.apiKey}}"
    },
    "log": {
        "sanitize": [
            "request.qs.api_key"
        ]
    }
}
```
10. We want to setup the app to receive the following Calcom events via [Instant Triggers](https://docs.integromat.com/apps/app-structure/modules/instant-trigger)
- Booking created
- Booking rescheduled
- Booking cancelled
- Meeting ended

11. Go to `Connections` directory of your app in the VSCode integration. Right click and click on `New Connection`. Assign label `apiKey` and type `apikey`. A new directory appears with a bunch of `json` file. Click on `Parameters` in this directory. Also, add a parameter for the `calDeploymentUrl`.  This is what the `json` looks like:
```json
[
    {
        "name": "apiKey",
        "type": "text",
        "label": "API Key",
        "help": "Enter the API Key generated in your Cal.com. Go to `/apps/make/setup` to generate a new API Key.",
        "required": true
    },
    {
        "name": "calDeploymentUrl",
        "type": "text",
        "label": "Cal Deployment URL",
        "help": "Enter the Cal Deployment URL. This is the URL of your Cal.com deployment. For local development use an ngrok url e.g. `https://4xoxo-1xx-50-229-221.ngrok-free.app`."
    }
]
```

Set the `Communication` file in the `apiKey` connection as follows:
```json
{
    "url": "{{parameters.calDeploymentUrl}}",
    "qs": {
        "api_key": "{{parameters.apiKey}}",
        "q": "us"
    },
    "log": {
        "sanitize": [
            "request.qs.api_key"
        ]
    }
}
```

12. Go to `Webhooks` in the app directory, right click and select `New Webhook`. Enter the name as `cal_subscribe_events`, select type as `Dedicated` and select connection as `apiKey`. Create two more webhooks with the name `cal_unsubscribe_events` and `cal_list_bookings`.

13. Go to `Modules` in the app directory, right click and select `New Module`. Set name as `Booking Created`, `moduleId` as `bookingCreated`, `type` as `Instant Trigger` and select the `cal_subscribe_events` webhook created earlier. Likewise, create modules for `Booking Deleted`, `Booking Rescheduled` and `Meeting Ended`. Go to your app on the Make dashboard and toggle the visible button to 'ON' for all the modules created.

14. Create a module of type `Search` and name `List Bookings`. Here's the `Communication` file for this module:
        ```json
        {
            "url": "/api/integrations/make/listBookings",
            "method": "GET",
            "qs": {
                "apiKey": "{{connection.apiKey}}"
            },
            "body": {},
            "headers": {},
            "response": {
                "output": "{{body}}"
            }
        }
        ```
    We need to define the `Interface` for the booking object that is received by this module:
    ```json
    [
    {
        "name": "title",
        "type": "text",
        "label": "Title"
    },
    {
        "name": "description",
        "type": "text",
        "label": "Description"
    },
    {
        "name": "customInputs",
        "type": "collection",
        "spec": [],
        "label": "Custom Inputs"
    },
    {
        "name": "responses",
        "type": "collection",
        "spec": [
            {
                "name": "name",
                "type": "collection",
                "spec": [
                    {
                        "name": "label",
                        "type": "text"
                    },
                    {
                        "name": "value",
                        "type": "text"
                    }
                ]
            },
            {
                "name": "email",
                "type": "collection",
                "spec": [
                    {
                        "name": "label",
                        "type": "text"
                    },
                    {
                        "name": "value",
                        "type": "text"
                    }
                ]
            },
            {
                "name": "location",
                "type": "collection",
                "spec": [
                    {
                        "name": "label",
                        "type": "text"
                    },
                    {
                        "name": "value",
                        "type": "collection",
                        "spec": [
                            {
                                "name": "optionValue",
                                "type": "text"
                            },
                            {
                                "name": "value",
                                "type": "text"
                            }
                        ]
                    }
                ]
            },
            {
                "name": "notes",
                "type": "collection",
                "spec": [
                    {
                        "name": "label",
                        "type": "text"
                    }
                ]
            },
            {
                "name": "guests",
                "type": "collection",
                "spec": [
                    {
                        "name": "label",
                        "type": "text"
                    }
                ]
            },
            {
                "name": "rescheduleReason",
                "type": "collection",
                "spec": [
                    {
                        "name": "label",
                        "type": "text"
                    }
                ]
            }
        ],
        "label": "Responses"
    },
    {
        "name": "startTime",
        "type": "date",
        "label": "Start Time"
    },
    {
        "name": "endTime",
        "type": "date",
        "label": "End Time"
    },
    {
        "name": "location",
        "type": "text",
        "label": "Location"
    },
    {
        "name": "cancellationReason",
        "type": "text",
        "label": "Cancellation Reason"
    },
    {
        "name": "status",
        "type": "text",
        "label": "Status"
    },
    {
        "name": "user",
        "type": "collection",
        "spec": [
            {
                "name": "username",
                "type": "text"
            },
            {
                "name": "name",
                "type": "text"
            },
            {
                "name": "email",
                "type": "text"
            },
            {
                "name": "timeZone",
                "type": "text"
            },
            {
                "name": "locale",
                "type": "text"
            }
        ],
        "label": "User"
    },
    {
        "name": "eventType",
        "type": "collection",
        "spec": [
            {
                "name": "title",
                "type": "text"
            },
            {
                "name": "description",
                "type": "text"
            },
            {
                "name": "requiresConfirmation",
                "type": "boolean"
            },
            {
                "name": "price",
                "type": "number"
            },
            {
                "name": "currency",
                "type": "text"
            },
            {
                "name": "length",
                "type": "number"
            },
            {
                "name": "bookingFields",
                "type": "array",
                "spec": {
                    "type": "collection",
                    "spec": [
                        {
                            "name": "name",
                            "type": "text"
                        },
                        {
                            "name": "type",
                            "type": "text"
                        },
                        {
                            "name": "sources",
                            "type": "array",
                            "spec": {
                                "type": "collection",
                                "spec": [
                                    {
                                        "name": "id",
                                        "type": "text"
                                    },
                                    {
                                        "name": "type",
                                        "type": "text"
                                    },
                                    {
                                        "name": "label",
                                        "type": "text"
                                    }
                                ]
                            }
                        },
                        {
                            "name": "editable",
                            "type": "text"
                        },
                        {
                            "name": "required",
                            "type": "boolean"
                        },
                        {
                            "name": "defaultLabel",
                            "type": "text"
                        },
                        {
                            "name": "defaultPlaceholder",
                            "type": "text"
                        }
                    ]
                }
            }
        ],
        "label": "Event Type"
    },
    {
        "name": "attendees",
        "type": "array",
        "label": "Attendees"
    },
    {
        "name": "userFieldsResponses",
        "type": "collection",
        "spec": [],
        "label": "User Fields Responses"
    }
]
    ```

13. Once the app is published, an invite link it generated on the Make platform. Add this to Cal under `/settings/admin/apps/automation`. Now other users can use the app.


App Invite Link: "https://www.make.com/en/hq/app-invitation/6cb2772b61966508dd8f414ba3b44510"
References:
- Good [video on building custom apps](https://www.youtube.com/watch?v=CCxeCgZbSh8)
- [Building a custom app in Make](https://www.make.com/en/use-cases/build-custom-app-in-make)
Notes:
- 
## Testing
Example automation with [Google Calendar & Notion](https://www.youtube.com/watch?v=lLq9Tx26XRU)

```json
"url": "/api/integrations/make/listBookings",
    "method": "GET",
    "qs": {
        "apiKey": "{{bundle.authData.apiKey}}"
    },
    "response": {
        "output": {
            "data": "{{body}}",
            "webhookUrl": "{{webhook.webhookUrl}}"
        }
    }
```