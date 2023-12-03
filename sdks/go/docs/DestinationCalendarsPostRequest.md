# DestinationCalendarsPostRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Integration** | **string** | The integration | 
**ExternalId** | **string** | The external ID of the integration | 
**EventTypeId** | Pointer to **int32** | The ID of the eventType it is associated with | [optional] 
**BookingId** | Pointer to **int32** | The booking ID it is associated with | [optional] 
**UserId** | Pointer to **int32** | The user it is associated with | [optional] 

## Methods

### NewDestinationCalendarsPostRequest

`func NewDestinationCalendarsPostRequest(integration string, externalId string, ) *DestinationCalendarsPostRequest`

NewDestinationCalendarsPostRequest instantiates a new DestinationCalendarsPostRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewDestinationCalendarsPostRequestWithDefaults

`func NewDestinationCalendarsPostRequestWithDefaults() *DestinationCalendarsPostRequest`

NewDestinationCalendarsPostRequestWithDefaults instantiates a new DestinationCalendarsPostRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetIntegration

`func (o *DestinationCalendarsPostRequest) GetIntegration() string`

GetIntegration returns the Integration field if non-nil, zero value otherwise.

### GetIntegrationOk

`func (o *DestinationCalendarsPostRequest) GetIntegrationOk() (*string, bool)`

GetIntegrationOk returns a tuple with the Integration field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIntegration

`func (o *DestinationCalendarsPostRequest) SetIntegration(v string)`

SetIntegration sets Integration field to given value.


### GetExternalId

`func (o *DestinationCalendarsPostRequest) GetExternalId() string`

GetExternalId returns the ExternalId field if non-nil, zero value otherwise.

### GetExternalIdOk

`func (o *DestinationCalendarsPostRequest) GetExternalIdOk() (*string, bool)`

GetExternalIdOk returns a tuple with the ExternalId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExternalId

`func (o *DestinationCalendarsPostRequest) SetExternalId(v string)`

SetExternalId sets ExternalId field to given value.


### GetEventTypeId

`func (o *DestinationCalendarsPostRequest) GetEventTypeId() int32`

GetEventTypeId returns the EventTypeId field if non-nil, zero value otherwise.

### GetEventTypeIdOk

`func (o *DestinationCalendarsPostRequest) GetEventTypeIdOk() (*int32, bool)`

GetEventTypeIdOk returns a tuple with the EventTypeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTypeId

`func (o *DestinationCalendarsPostRequest) SetEventTypeId(v int32)`

SetEventTypeId sets EventTypeId field to given value.

### HasEventTypeId

`func (o *DestinationCalendarsPostRequest) HasEventTypeId() bool`

HasEventTypeId returns a boolean if a field has been set.

### GetBookingId

`func (o *DestinationCalendarsPostRequest) GetBookingId() int32`

GetBookingId returns the BookingId field if non-nil, zero value otherwise.

### GetBookingIdOk

`func (o *DestinationCalendarsPostRequest) GetBookingIdOk() (*int32, bool)`

GetBookingIdOk returns a tuple with the BookingId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBookingId

`func (o *DestinationCalendarsPostRequest) SetBookingId(v int32)`

SetBookingId sets BookingId field to given value.

### HasBookingId

`func (o *DestinationCalendarsPostRequest) HasBookingId() bool`

HasBookingId returns a boolean if a field has been set.

### GetUserId

`func (o *DestinationCalendarsPostRequest) GetUserId() int32`

GetUserId returns the UserId field if non-nil, zero value otherwise.

### GetUserIdOk

`func (o *DestinationCalendarsPostRequest) GetUserIdOk() (*int32, bool)`

GetUserIdOk returns a tuple with the UserId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUserId

`func (o *DestinationCalendarsPostRequest) SetUserId(v int32)`

SetUserId sets UserId field to given value.

### HasUserId

`func (o *DestinationCalendarsPostRequest) HasUserId() bool`

HasUserId returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


