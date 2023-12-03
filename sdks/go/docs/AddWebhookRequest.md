# AddWebhookRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SubscriberUrl** | **string** | The URL to subscribe to this webhook | 
**EventTriggers** | **string** | The events which should trigger this webhook call | 
**Active** | **bool** | Whether the webhook is active and should trigger on associated trigger events | 
**PayloadTemplate** | Pointer to **string** | The template of the webhook&#39;s payload | [optional] 
**EventTypeId** | Pointer to **float32** | The event type ID if this webhook should be associated with only that event type | [optional] 
**Secret** | Pointer to **string** | The secret to verify the authenticity of the received payload | [optional] 

## Methods

### NewAddWebhookRequest

`func NewAddWebhookRequest(subscriberUrl string, eventTriggers string, active bool, ) *AddWebhookRequest`

NewAddWebhookRequest instantiates a new AddWebhookRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddWebhookRequestWithDefaults

`func NewAddWebhookRequestWithDefaults() *AddWebhookRequest`

NewAddWebhookRequestWithDefaults instantiates a new AddWebhookRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSubscriberUrl

`func (o *AddWebhookRequest) GetSubscriberUrl() string`

GetSubscriberUrl returns the SubscriberUrl field if non-nil, zero value otherwise.

### GetSubscriberUrlOk

`func (o *AddWebhookRequest) GetSubscriberUrlOk() (*string, bool)`

GetSubscriberUrlOk returns a tuple with the SubscriberUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSubscriberUrl

`func (o *AddWebhookRequest) SetSubscriberUrl(v string)`

SetSubscriberUrl sets SubscriberUrl field to given value.


### GetEventTriggers

`func (o *AddWebhookRequest) GetEventTriggers() string`

GetEventTriggers returns the EventTriggers field if non-nil, zero value otherwise.

### GetEventTriggersOk

`func (o *AddWebhookRequest) GetEventTriggersOk() (*string, bool)`

GetEventTriggersOk returns a tuple with the EventTriggers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTriggers

`func (o *AddWebhookRequest) SetEventTriggers(v string)`

SetEventTriggers sets EventTriggers field to given value.


### GetActive

`func (o *AddWebhookRequest) GetActive() bool`

GetActive returns the Active field if non-nil, zero value otherwise.

### GetActiveOk

`func (o *AddWebhookRequest) GetActiveOk() (*bool, bool)`

GetActiveOk returns a tuple with the Active field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetActive

`func (o *AddWebhookRequest) SetActive(v bool)`

SetActive sets Active field to given value.


### GetPayloadTemplate

`func (o *AddWebhookRequest) GetPayloadTemplate() string`

GetPayloadTemplate returns the PayloadTemplate field if non-nil, zero value otherwise.

### GetPayloadTemplateOk

`func (o *AddWebhookRequest) GetPayloadTemplateOk() (*string, bool)`

GetPayloadTemplateOk returns a tuple with the PayloadTemplate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayloadTemplate

`func (o *AddWebhookRequest) SetPayloadTemplate(v string)`

SetPayloadTemplate sets PayloadTemplate field to given value.

### HasPayloadTemplate

`func (o *AddWebhookRequest) HasPayloadTemplate() bool`

HasPayloadTemplate returns a boolean if a field has been set.

### GetEventTypeId

`func (o *AddWebhookRequest) GetEventTypeId() float32`

GetEventTypeId returns the EventTypeId field if non-nil, zero value otherwise.

### GetEventTypeIdOk

`func (o *AddWebhookRequest) GetEventTypeIdOk() (*float32, bool)`

GetEventTypeIdOk returns a tuple with the EventTypeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTypeId

`func (o *AddWebhookRequest) SetEventTypeId(v float32)`

SetEventTypeId sets EventTypeId field to given value.

### HasEventTypeId

`func (o *AddWebhookRequest) HasEventTypeId() bool`

HasEventTypeId returns a boolean if a field has been set.

### GetSecret

`func (o *AddWebhookRequest) GetSecret() string`

GetSecret returns the Secret field if non-nil, zero value otherwise.

### GetSecretOk

`func (o *AddWebhookRequest) GetSecretOk() (*string, bool)`

GetSecretOk returns a tuple with the Secret field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecret

`func (o *AddWebhookRequest) SetSecret(v string)`

SetSecret sets Secret field to given value.

### HasSecret

`func (o *AddWebhookRequest) HasSecret() bool`

HasSecret returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


