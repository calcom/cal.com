# BookingPaymentInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **float** |  | [optional] 
**success** | **bool** |  | [optional] 
**payment_option** | **str** |  | [optional] 

## Example

```python
from openapi_client.models.booking_payment_inner import BookingPaymentInner

# TODO update the JSON string below
json = "{}"
# create an instance of BookingPaymentInner from a JSON string
booking_payment_inner_instance = BookingPaymentInner.from_json(json)
# print the JSON string representation of the object
print BookingPaymentInner.to_json()

# convert the object into a dict
booking_payment_inner_dict = booking_payment_inner_instance.to_dict()
# create an instance of BookingPaymentInner from a dict
booking_payment_inner_form_dict = booking_payment_inner.from_dict(booking_payment_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


