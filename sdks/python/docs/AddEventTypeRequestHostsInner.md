# AddEventTypeRequestHostsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**user_id** | **float** |  | [optional] 
**is_fixed** | **bool** | Host MUST be available for any slot to be bookable. | [optional] 

## Example

```python
from openapi_client.models.add_event_type_request_hosts_inner import AddEventTypeRequestHostsInner

# TODO update the JSON string below
json = "{}"
# create an instance of AddEventTypeRequestHostsInner from a JSON string
add_event_type_request_hosts_inner_instance = AddEventTypeRequestHostsInner.from_json(json)
# print the JSON string representation of the object
print AddEventTypeRequestHostsInner.to_json()

# convert the object into a dict
add_event_type_request_hosts_inner_dict = add_event_type_request_hosts_inner_instance.to_dict()
# create an instance of AddEventTypeRequestHostsInner from a dict
add_event_type_request_hosts_inner_form_dict = add_event_type_request_hosts_inner.from_dict(add_event_type_request_hosts_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


