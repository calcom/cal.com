Specs
- We don't want duplicate responses in a form for 30 days(configurable via @calcom/lib/constants.ts). We start with /router endpoint first which is mapped to apps/web/pages/router/index.tsx
- If duplicate response is submitted. Let's make a fn to detect duplicate response. We might want to improve it later.
    - We don't make a new record
    - We don't send webhooks/emails. I think we can skip onFormSubmission itself.
    - We return the existing response, but we also have some property that indicate that this response is a duplicate, so that client is aware of it.
    - But we take the route action that we take when a new response is submitted
TODO:     
- [x] In handleResponse, we need to ensure that we don't create new record in App_RoutingForms_Response for exact same response(i.e. same formId and response) for 30 days(configurable via @calcom/lib/constants.ts).
    - We added the responseHash and updatedAt fields to the App_RoutingForms_FormResponse model
    - We created a function to generate a hash of the response for efficient duplicate detection
    - We modified handleResponse to check for duplicates and handle them appropriately
    - We update the router endpoint to include the isDuplicate flag in responses
    - We display a notification to users when they submit a duplicate form

Open questions:
- What happens if an optional field is added later on to the form and the user doesn't fill it in and submits the form again. Would we consider it as a duplicate?
- What happens if a required field is removed later on from the form and the user doesn't fill it in and submits the form again. Would we consider it as a duplicate?
