# EditWebhookByIdRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**SubscriberUrl** | Pointer to **string** | The URL to subscribe to this webhook | [optional] 
**EventTriggers** | Pointer to **string** | The events which should trigger this webhook call | [optional] 
**Active** | Pointer to **bool** | Whether the webhook is active and should trigger on associated trigger events | [optional] 
**PayloadTemplate** | Pointer to **string** | The template of the webhook&#39;s payload | [optional] 
**EventTypeId** | Pointer to **float32** | The event type ID if this webhook should be associated with only that event type | [optional] 
**Secret** | Pointer to **string** | The secret to verify the authenticity of the received payload | [optional] 

## Methods

### NewEditWebhookByIdRequest

`func NewEditWebhookByIdRequest() *EditWebhookByIdRequest`

NewEditWebhookByIdRequest instantiates a new EditWebhookByIdRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEditWebhookByIdRequestWithDefaults

`func NewEditWebhookByIdRequestWithDefaults() *EditWebhookByIdRequest`

NewEditWebhookByIdRequestWithDefaults instantiates a new EditWebhookByIdRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetSubscriberUrl

`func (o *EditWebhookByIdRequest) GetSubscriberUrl() string`

GetSubscriberUrl returns the SubscriberUrl field if non-nil, zero value otherwise.

### GetSubscriberUrlOk

`func (o *EditWebhookByIdRequest) GetSubscriberUrlOk() (*string, bool)`

GetSubscriberUrlOk returns a tuple with the SubscriberUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSubscriberUrl

`func (o *EditWebhookByIdRequest) SetSubscriberUrl(v string)`

SetSubscriberUrl sets SubscriberUrl field to given value.

### HasSubscriberUrl

`func (o *EditWebhookByIdRequest) HasSubscriberUrl() bool`

HasSubscriberUrl returns a boolean if a field has been set.

### GetEventTriggers

`func (o *EditWebhookByIdRequest) GetEventTriggers() string`

GetEventTriggers returns the EventTriggers field if non-nil, zero value otherwise.

### GetEventTriggersOk

`func (o *EditWebhookByIdRequest) GetEventTriggersOk() (*string, bool)`

GetEventTriggersOk returns a tuple with the EventTriggers field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTriggers

`func (o *EditWebhookByIdRequest) SetEventTriggers(v string)`

SetEventTriggers sets EventTriggers field to given value.

### HasEventTriggers

`func (o *EditWebhookByIdRequest) HasEventTriggers() bool`

HasEventTriggers returns a boolean if a field has been set.

### GetActive

`func (o *EditWebhookByIdRequest) GetActive() bool`

GetActive returns the Active field if non-nil, zero value otherwise.

### GetActiveOk

`func (o *EditWebhookByIdRequest) GetActiveOk() (*bool, bool)`

GetActiveOk returns a tuple with the Active field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetActive

`func (o *EditWebhookByIdRequest) SetActive(v bool)`

SetActive sets Active field to given value.

### HasActive

`func (o *EditWebhookByIdRequest) HasActive() bool`

HasActive returns a boolean if a field has been set.

### GetPayloadTemplate

`func (o *EditWebhookByIdRequest) GetPayloadTemplate() string`

GetPayloadTemplate returns the PayloadTemplate field if non-nil, zero value otherwise.

### GetPayloadTemplateOk

`func (o *EditWebhookByIdRequest) GetPayloadTemplateOk() (*string, bool)`

GetPayloadTemplateOk returns a tuple with the PayloadTemplate field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayloadTemplate

`func (o *EditWebhookByIdRequest) SetPayloadTemplate(v string)`

SetPayloadTemplate sets PayloadTemplate field to given value.

### HasPayloadTemplate

`func (o *EditWebhookByIdRequest) HasPayloadTemplate() bool`

HasPayloadTemplate returns a boolean if a field has been set.

### GetEventTypeId

`func (o *EditWebhookByIdRequest) GetEventTypeId() float32`

GetEventTypeId returns the EventTypeId field if non-nil, zero value otherwise.

### GetEventTypeIdOk

`func (o *EditWebhookByIdRequest) GetEventTypeIdOk() (*float32, bool)`

GetEventTypeIdOk returns a tuple with the EventTypeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTypeId

`func (o *EditWebhookByIdRequest) SetEventTypeId(v float32)`

SetEventTypeId sets EventTypeId field to given value.

### HasEventTypeId

`func (o *EditWebhookByIdRequest) HasEventTypeId() bool`

HasEventTypeId returns a boolean if a field has been set.

### GetSecret

`func (o *EditWebhookByIdRequest) GetSecret() string`

GetSecret returns the Secret field if non-nil, zero value otherwise.

### GetSecretOk

`func (o *EditWebhookByIdRequest) GetSecretOk() (*string, bool)`

GetSecretOk returns a tuple with the Secret field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSecret

`func (o *EditWebhookByIdRequest) SetSecret(v string)`

SetSecret sets Secret field to given value.

### HasSecret

`func (o *EditWebhookByIdRequest) HasSecret() bool`

HasSecret returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


