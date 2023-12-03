# AddWebhookRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**subscriber_url** | **str** | The URL to subscribe to this webhook | 
**event_triggers** | **str** | The events which should trigger this webhook call | 
**active** | **bool** | Whether the webhook is active and should trigger on associated trigger events | 
**payload_template** | **str** | The template of the webhook&#39;s payload | [optional] 
**event_type_id** | **float** | The event type ID if this webhook should be associated with only that event type | [optional] 
**secret** | **str** | The secret to verify the authenticity of the received payload | [optional] 

## Example

```python
from openapi_client.models.add_webhook_request import AddWebhookRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AddWebhookRequest from a JSON string
add_webhook_request_instance = AddWebhookRequest.from_json(json)
# print the JSON string representation of the object
print AddWebhookRequest.to_json()

# convert the object into a dict
add_webhook_request_dict = add_webhook_request_instance.to_dict()
# create an instance of AddWebhookRequest from a dict
add_webhook_request_form_dict = add_webhook_request.from_dict(add_webhook_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


