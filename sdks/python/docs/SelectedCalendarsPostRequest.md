# SelectedCalendarsPostRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**integration** | **str** | The integration name | 
**external_id** | **str** | The external ID of the integration | 

## Example

```python
from openapi_client.models.selected_calendars_post_request import SelectedCalendarsPostRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SelectedCalendarsPostRequest from a JSON string
selected_calendars_post_request_instance = SelectedCalendarsPostRequest.from_json(json)
# print the JSON string representation of the object
print SelectedCalendarsPostRequest.to_json()

# convert the object into a dict
selected_calendars_post_request_dict = selected_calendars_post_request_instance.to_dict()
# create an instance of SelectedCalendarsPostRequest from a dict
selected_calendars_post_request_form_dict = selected_calendars_post_request.from_dict(selected_calendars_post_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


