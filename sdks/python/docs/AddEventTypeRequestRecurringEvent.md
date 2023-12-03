# AddEventTypeRequestRecurringEvent

If the event should recur every week/month/year with the selected frequency

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**interval** | **int** |  | [optional] 
**count** | **int** |  | [optional] 
**freq** | **int** |  | [optional] 

## Example

```python
from openapi_client.models.add_event_type_request_recurring_event import AddEventTypeRequestRecurringEvent

# TODO update the JSON string below
json = "{}"
# create an instance of AddEventTypeRequestRecurringEvent from a JSON string
add_event_type_request_recurring_event_instance = AddEventTypeRequestRecurringEvent.from_json(json)
# print the JSON string representation of the object
print AddEventTypeRequestRecurringEvent.to_json()

# convert the object into a dict
add_event_type_request_recurring_event_dict = add_event_type_request_recurring_event_instance.to_dict()
# create an instance of AddEventTypeRequestRecurringEvent from a dict
add_event_type_request_recurring_event_form_dict = add_event_type_request_recurring_event.from_dict(add_event_type_request_recurring_event_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


