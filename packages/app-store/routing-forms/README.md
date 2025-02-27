# Routing Forms App

## Vocabulary
- RaqbField refers to the field in the context of React Awesome Query Builder(RAQB)
    - See `getQueryBuilderConfig`
- Field refers to the field in the Routing Form


## Understanding the structure of queryValue(type JsonTree)

### AttributeQueryValue
- {
    id: "Some-id-generated-and-used-internally-by-raqb"
    type: "group",
    children1: {
        "Some-other-id-generated-and-used-internally-by-raqb": {
            type: "rule",
            properties: {
                field: "ATTRIBUTE.id",
                operator: "multiselect_equals", // One of many operators possible
                value: ["AttributeOption.id"],
                // This is the type of the attribute and the operator corresponds to it. The data provided to jsonLogic on which the logic(generated from RAQB config and this queryValue) is applied must also be as per the requirement of the operator.
                valueType: ["multiselect"] 
            }
        }
    }
    
}

## How to run Tests

`yarn e2e:app-store` runs all Apps' tests. You can use `describe.only()` to run Routing Forms tests only.

Make sure that the app is running already with NEXT_PUBLIC_IS_E2E=1 so that the app is installable

# Features

## non-required required fields in Headless Mode

For specific organizations, you can allow required fields to be optional when using the headless router mode. This is controlled by the `HEADLESS_ROUTER_NO_REQ_FIELDS_ORG_IDS` environment variable. It could make sense to allow this considering that in headless router, fields are manually added by the developer to the headless router endpoint(/router). We could remove this feature, if it doesn't make sense, after we implement versioning of routing forms.

### Configuration

1. Set the `HEADLESS_ROUTER_NO_REQ_FIELDS_ORG_IDS` environment variable with a comma-separated list of organization IDs that should have this feature enabled:

```env
HEADLESS_ROUTER_NO_REQ_FIELDS_ORG_IDS=org1,org2,org3
```

2. When using the headless router (URL format: `https://cal.com/router?formId={FORMID}`), required fields will be optional for the specified organizations.

3. The headed mode (URL format: `https://cal.com/forms/{FORMID}`) will continue to enforce required fields for all organizations.
