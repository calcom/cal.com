# DestinationCalendarsPostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**integration** | **str** | The integration | 
**external_id** | **str** | The external ID of the integration | 
**event_type_id** | **int** | The ID of the eventType it is associated with | [optional] 
**booking_id** | **int** | The booking ID it is associated with | [optional] 
**user_id** | **int** | The user it is associated with | [optional] 

## Example

```python
from openapi_client.models.destination_calendars_post_request import DestinationCalendarsPostRequest

# TODO update the JSON string below
json = "{}"
# create an instance of DestinationCalendarsPostRequest from a JSON string
destination_calendars_post_request_instance = DestinationCalendarsPostRequest.from_json(json)
# print the JSON string representation of the object
print DestinationCalendarsPostRequest.to_json()

# convert the object into a dict
destination_calendars_post_request_dict = destination_calendars_post_request_instance.to_dict()
# create an instance of DestinationCalendarsPostRequest from a dict
destination_calendars_post_request_form_dict = destination_calendars_post_request.from_dict(destination_calendars_post_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


