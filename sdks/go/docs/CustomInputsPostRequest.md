# CustomInputsPostRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EventTypeId** | **int32** | ID of the event type to which the custom input is being added | 
**Label** | **string** | Label of the custom input | 
**Type** | **string** | Type of the custom input. The value is ENUM; one of [TEXT, TEXTLONG, NUMBER, BOOL, RADIO, PHONE] | 
**Options** | Pointer to [**CustomInputsPostRequestOptions**](CustomInputsPostRequestOptions.md) |  | [optional] 
**Required** | **bool** | If the custom input is required before booking | 
**Placeholder** | **string** | Placeholder text for the custom input | 

## Methods

### NewCustomInputsPostRequest

`func NewCustomInputsPostRequest(eventTypeId int32, label string, type_ string, required bool, placeholder string, ) *CustomInputsPostRequest`

NewCustomInputsPostRequest instantiates a new CustomInputsPostRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCustomInputsPostRequestWithDefaults

`func NewCustomInputsPostRequestWithDefaults() *CustomInputsPostRequest`

NewCustomInputsPostRequestWithDefaults instantiates a new CustomInputsPostRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEventTypeId

`func (o *CustomInputsPostRequest) GetEventTypeId() int32`

GetEventTypeId returns the EventTypeId field if non-nil, zero value otherwise.

### GetEventTypeIdOk

`func (o *CustomInputsPostRequest) GetEventTypeIdOk() (*int32, bool)`

GetEventTypeIdOk returns a tuple with the EventTypeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTypeId

`func (o *CustomInputsPostRequest) SetEventTypeId(v int32)`

SetEventTypeId sets EventTypeId field to given value.


### GetLabel

`func (o *CustomInputsPostRequest) GetLabel() string`

GetLabel returns the Label field if non-nil, zero value otherwise.

### GetLabelOk

`func (o *CustomInputsPostRequest) GetLabelOk() (*string, bool)`

GetLabelOk returns a tuple with the Label field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabel

`func (o *CustomInputsPostRequest) SetLabel(v string)`

SetLabel sets Label field to given value.


### GetType

`func (o *CustomInputsPostRequest) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CustomInputsPostRequest) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CustomInputsPostRequest) SetType(v string)`

SetType sets Type field to given value.


### GetOptions

`func (o *CustomInputsPostRequest) GetOptions() CustomInputsPostRequestOptions`

GetOptions returns the Options field if non-nil, zero value otherwise.

### GetOptionsOk

`func (o *CustomInputsPostRequest) GetOptionsOk() (*CustomInputsPostRequestOptions, bool)`

GetOptionsOk returns a tuple with the Options field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOptions

`func (o *CustomInputsPostRequest) SetOptions(v CustomInputsPostRequestOptions)`

SetOptions sets Options field to given value.

### HasOptions

`func (o *CustomInputsPostRequest) HasOptions() bool`

HasOptions returns a boolean if a field has been set.

### GetRequired

`func (o *CustomInputsPostRequest) GetRequired() bool`

GetRequired returns the Required field if non-nil, zero value otherwise.

### GetRequiredOk

`func (o *CustomInputsPostRequest) GetRequiredOk() (*bool, bool)`

GetRequiredOk returns a tuple with the Required field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRequired

`func (o *CustomInputsPostRequest) SetRequired(v bool)`

SetRequired sets Required field to given value.


### GetPlaceholder

`func (o *CustomInputsPostRequest) GetPlaceholder() string`

GetPlaceholder returns the Placeholder field if non-nil, zero value otherwise.

### GetPlaceholderOk

`func (o *CustomInputsPostRequest) GetPlaceholderOk() (*string, bool)`

GetPlaceholderOk returns a tuple with the Placeholder field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlaceholder

`func (o *CustomInputsPostRequest) SetPlaceholder(v string)`

SetPlaceholder sets Placeholder field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


