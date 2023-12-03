# CustomInputsIdPatchRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**EventTypeId** | Pointer to **int32** | ID of the event type to which the custom input is being added | [optional] 
**Label** | Pointer to **string** | Label of the custom input | [optional] 
**Type** | Pointer to **string** | Type of the custom input. The value is ENUM; one of [TEXT, TEXTLONG, NUMBER, BOOL, RADIO, PHONE] | [optional] 
**Options** | Pointer to [**CustomInputsPostRequestOptions**](CustomInputsPostRequestOptions.md) |  | [optional] 
**Required** | Pointer to **bool** | If the custom input is required before booking | [optional] 
**Placeholder** | Pointer to **string** | Placeholder text for the custom input | [optional] 

## Methods

### NewCustomInputsIdPatchRequest

`func NewCustomInputsIdPatchRequest() *CustomInputsIdPatchRequest`

NewCustomInputsIdPatchRequest instantiates a new CustomInputsIdPatchRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewCustomInputsIdPatchRequestWithDefaults

`func NewCustomInputsIdPatchRequestWithDefaults() *CustomInputsIdPatchRequest`

NewCustomInputsIdPatchRequestWithDefaults instantiates a new CustomInputsIdPatchRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetEventTypeId

`func (o *CustomInputsIdPatchRequest) GetEventTypeId() int32`

GetEventTypeId returns the EventTypeId field if non-nil, zero value otherwise.

### GetEventTypeIdOk

`func (o *CustomInputsIdPatchRequest) GetEventTypeIdOk() (*int32, bool)`

GetEventTypeIdOk returns a tuple with the EventTypeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTypeId

`func (o *CustomInputsIdPatchRequest) SetEventTypeId(v int32)`

SetEventTypeId sets EventTypeId field to given value.

### HasEventTypeId

`func (o *CustomInputsIdPatchRequest) HasEventTypeId() bool`

HasEventTypeId returns a boolean if a field has been set.

### GetLabel

`func (o *CustomInputsIdPatchRequest) GetLabel() string`

GetLabel returns the Label field if non-nil, zero value otherwise.

### GetLabelOk

`func (o *CustomInputsIdPatchRequest) GetLabelOk() (*string, bool)`

GetLabelOk returns a tuple with the Label field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLabel

`func (o *CustomInputsIdPatchRequest) SetLabel(v string)`

SetLabel sets Label field to given value.

### HasLabel

`func (o *CustomInputsIdPatchRequest) HasLabel() bool`

HasLabel returns a boolean if a field has been set.

### GetType

`func (o *CustomInputsIdPatchRequest) GetType() string`

GetType returns the Type field if non-nil, zero value otherwise.

### GetTypeOk

`func (o *CustomInputsIdPatchRequest) GetTypeOk() (*string, bool)`

GetTypeOk returns a tuple with the Type field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetType

`func (o *CustomInputsIdPatchRequest) SetType(v string)`

SetType sets Type field to given value.

### HasType

`func (o *CustomInputsIdPatchRequest) HasType() bool`

HasType returns a boolean if a field has been set.

### GetOptions

`func (o *CustomInputsIdPatchRequest) GetOptions() CustomInputsPostRequestOptions`

GetOptions returns the Options field if non-nil, zero value otherwise.

### GetOptionsOk

`func (o *CustomInputsIdPatchRequest) GetOptionsOk() (*CustomInputsPostRequestOptions, bool)`

GetOptionsOk returns a tuple with the Options field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOptions

`func (o *CustomInputsIdPatchRequest) SetOptions(v CustomInputsPostRequestOptions)`

SetOptions sets Options field to given value.

### HasOptions

`func (o *CustomInputsIdPatchRequest) HasOptions() bool`

HasOptions returns a boolean if a field has been set.

### GetRequired

`func (o *CustomInputsIdPatchRequest) GetRequired() bool`

GetRequired returns the Required field if non-nil, zero value otherwise.

### GetRequiredOk

`func (o *CustomInputsIdPatchRequest) GetRequiredOk() (*bool, bool)`

GetRequiredOk returns a tuple with the Required field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRequired

`func (o *CustomInputsIdPatchRequest) SetRequired(v bool)`

SetRequired sets Required field to given value.

### HasRequired

`func (o *CustomInputsIdPatchRequest) HasRequired() bool`

HasRequired returns a boolean if a field has been set.

### GetPlaceholder

`func (o *CustomInputsIdPatchRequest) GetPlaceholder() string`

GetPlaceholder returns the Placeholder field if non-nil, zero value otherwise.

### GetPlaceholderOk

`func (o *CustomInputsIdPatchRequest) GetPlaceholderOk() (*string, bool)`

GetPlaceholderOk returns a tuple with the Placeholder field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlaceholder

`func (o *CustomInputsIdPatchRequest) SetPlaceholder(v string)`

SetPlaceholder sets Placeholder field to given value.

### HasPlaceholder

`func (o *CustomInputsIdPatchRequest) HasPlaceholder() bool`

HasPlaceholder returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


