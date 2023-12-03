# BookingAttendeesInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**email** | **str** |  | [optional] 
**name** | **str** |  | [optional] 
**time_zone** | **str** |  | [optional] 
**locale** | **str** |  | [optional] 

## Example

```python
from openapi_client.models.booking_attendees_inner import BookingAttendeesInner

# TODO update the JSON string below
json = "{}"
# create an instance of BookingAttendeesInner from a JSON string
booking_attendees_inner_instance = BookingAttendeesInner.from_json(json)
# print the JSON string representation of the object
print BookingAttendeesInner.to_json()

# convert the object into a dict
booking_attendees_inner_dict = booking_attendees_inner_instance.to_dict()
# create an instance of BookingAttendeesInner from a dict
booking_attendees_inner_form_dict = booking_attendees_inner.from_dict(booking_attendees_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


