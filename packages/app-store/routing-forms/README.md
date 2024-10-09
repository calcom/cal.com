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
