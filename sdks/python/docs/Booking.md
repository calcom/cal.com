# Booking


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **float** |  | [optional] 
**description** | **str** |  | [optional] 
**event_type_id** | **float** |  | [optional] 
**uid** | **str** |  | [optional] 
**title** | **str** |  | [optional] 
**start_time** | **datetime** |  | [optional] 
**end_time** | **datetime** |  | [optional] 
**time_zone** | **str** |  | [optional] 
**attendees** | [**List[BookingAttendeesInner]**](BookingAttendeesInner.md) |  | [optional] 
**user** | [**BookingAttendeesInner**](BookingAttendeesInner.md) |  | [optional] 
**payment** | [**List[BookingPaymentInner]**](BookingPaymentInner.md) |  | [optional] 

## Example

```python
from openapi_client.models.booking import Booking

# TODO update the JSON string below
json = "{}"
# create an instance of Booking from a JSON string
booking_instance = Booking.from_json(json)
# print the JSON string representation of the object
print Booking.to_json()

# convert the object into a dict
booking_dict = booking_instance.to_dict()
# create an instance of Booking from a dict
booking_form_dict = booking.from_dict(booking_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


