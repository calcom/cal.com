# EditAvailabilityByIdRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Days** | Pointer to **[]int32** | Array of integers depicting weekdays | [optional] 
**ScheduleId** | Pointer to **int32** | ID of schedule this availability is associated with | [optional] 
**StartTime** | Pointer to **string** | Start time of the availability | [optional] 
**EndTime** | Pointer to **string** | End time of the availability | [optional] 

## Methods

### NewEditAvailabilityByIdRequest

`func NewEditAvailabilityByIdRequest() *EditAvailabilityByIdRequest`

NewEditAvailabilityByIdRequest instantiates a new EditAvailabilityByIdRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEditAvailabilityByIdRequestWithDefaults

`func NewEditAvailabilityByIdRequestWithDefaults() *EditAvailabilityByIdRequest`

NewEditAvailabilityByIdRequestWithDefaults instantiates a new EditAvailabilityByIdRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDays

`func (o *EditAvailabilityByIdRequest) GetDays() []int32`

GetDays returns the Days field if non-nil, zero value otherwise.

### GetDaysOk

`func (o *EditAvailabilityByIdRequest) GetDaysOk() (*[]int32, bool)`

GetDaysOk returns a tuple with the Days field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDays

`func (o *EditAvailabilityByIdRequest) SetDays(v []int32)`

SetDays sets Days field to given value.

### HasDays

`func (o *EditAvailabilityByIdRequest) HasDays() bool`

HasDays returns a boolean if a field has been set.

### GetScheduleId

`func (o *EditAvailabilityByIdRequest) GetScheduleId() int32`

GetScheduleId returns the ScheduleId field if non-nil, zero value otherwise.

### GetScheduleIdOk

`func (o *EditAvailabilityByIdRequest) GetScheduleIdOk() (*int32, bool)`

GetScheduleIdOk returns a tuple with the ScheduleId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScheduleId

`func (o *EditAvailabilityByIdRequest) SetScheduleId(v int32)`

SetScheduleId sets ScheduleId field to given value.

### HasScheduleId

`func (o *EditAvailabilityByIdRequest) HasScheduleId() bool`

HasScheduleId returns a boolean if a field has been set.

### GetStartTime

`func (o *EditAvailabilityByIdRequest) GetStartTime() string`

GetStartTime returns the StartTime field if non-nil, zero value otherwise.

### GetStartTimeOk

`func (o *EditAvailabilityByIdRequest) GetStartTimeOk() (*string, bool)`

GetStartTimeOk returns a tuple with the StartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTime

`func (o *EditAvailabilityByIdRequest) SetStartTime(v string)`

SetStartTime sets StartTime field to given value.

### HasStartTime

`func (o *EditAvailabilityByIdRequest) HasStartTime() bool`

HasStartTime returns a boolean if a field has been set.

### GetEndTime

`func (o *EditAvailabilityByIdRequest) GetEndTime() string`

GetEndTime returns the EndTime field if non-nil, zero value otherwise.

### GetEndTimeOk

`func (o *EditAvailabilityByIdRequest) GetEndTimeOk() (*string, bool)`

GetEndTimeOk returns a tuple with the EndTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndTime

`func (o *EditAvailabilityByIdRequest) SetEndTime(v string)`

SetEndTime sets EndTime field to given value.

### HasEndTime

`func (o *EditAvailabilityByIdRequest) HasEndTime() bool`

HasEndTime returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


