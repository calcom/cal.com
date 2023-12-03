# AddEventTypeRequestHostsInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**UserId** | Pointer to **float32** |  | [optional] 
**IsFixed** | Pointer to **bool** | Host MUST be available for any slot to be bookable. | [optional] 

## Methods

### NewAddEventTypeRequestHostsInner

`func NewAddEventTypeRequestHostsInner() *AddEventTypeRequestHostsInner`

NewAddEventTypeRequestHostsInner instantiates a new AddEventTypeRequestHostsInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddEventTypeRequestHostsInnerWithDefaults

`func NewAddEventTypeRequestHostsInnerWithDefaults() *AddEventTypeRequestHostsInner`

NewAddEventTypeRequestHostsInnerWithDefaults instantiates a new AddEventTypeRequestHostsInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetUserId

`func (o *AddEventTypeRequestHostsInner) GetUserId() float32`

GetUserId returns the UserId field if non-nil, zero value otherwise.

### GetUserIdOk

`func (o *AddEventTypeRequestHostsInner) GetUserIdOk() (*float32, bool)`

GetUserIdOk returns a tuple with the UserId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUserId

`func (o *AddEventTypeRequestHostsInner) SetUserId(v float32)`

SetUserId sets UserId field to given value.

### HasUserId

`func (o *AddEventTypeRequestHostsInner) HasUserId() bool`

HasUserId returns a boolean if a field has been set.

### GetIsFixed

`func (o *AddEventTypeRequestHostsInner) GetIsFixed() bool`

GetIsFixed returns the IsFixed field if non-nil, zero value otherwise.

### GetIsFixedOk

`func (o *AddEventTypeRequestHostsInner) GetIsFixedOk() (*bool, bool)`

GetIsFixedOk returns a tuple with the IsFixed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsFixed

`func (o *AddEventTypeRequestHostsInner) SetIsFixed(v bool)`

SetIsFixed sets IsFixed field to given value.

### HasIsFixed

`func (o *AddEventTypeRequestHostsInner) HasIsFixed() bool`

HasIsFixed returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


