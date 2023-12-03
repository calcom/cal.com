# AddAvailabilityRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Days** | Pointer to **[]int32** | Array of integers depicting weekdays | [optional] 
**ScheduleId** | **int32** | ID of schedule this availability is associated with | 
**StartTime** | **string** | Start time of the availability | 
**EndTime** | **string** | End time of the availability | 

## Methods

### NewAddAvailabilityRequest

`func NewAddAvailabilityRequest(scheduleId int32, startTime string, endTime string, ) *AddAvailabilityRequest`

NewAddAvailabilityRequest instantiates a new AddAvailabilityRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddAvailabilityRequestWithDefaults

`func NewAddAvailabilityRequestWithDefaults() *AddAvailabilityRequest`

NewAddAvailabilityRequestWithDefaults instantiates a new AddAvailabilityRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetDays

`func (o *AddAvailabilityRequest) GetDays() []int32`

GetDays returns the Days field if non-nil, zero value otherwise.

### GetDaysOk

`func (o *AddAvailabilityRequest) GetDaysOk() (*[]int32, bool)`

GetDaysOk returns a tuple with the Days field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDays

`func (o *AddAvailabilityRequest) SetDays(v []int32)`

SetDays sets Days field to given value.

### HasDays

`func (o *AddAvailabilityRequest) HasDays() bool`

HasDays returns a boolean if a field has been set.

### GetScheduleId

`func (o *AddAvailabilityRequest) GetScheduleId() int32`

GetScheduleId returns the ScheduleId field if non-nil, zero value otherwise.

### GetScheduleIdOk

`func (o *AddAvailabilityRequest) GetScheduleIdOk() (*int32, bool)`

GetScheduleIdOk returns a tuple with the ScheduleId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScheduleId

`func (o *AddAvailabilityRequest) SetScheduleId(v int32)`

SetScheduleId sets ScheduleId field to given value.


### GetStartTime

`func (o *AddAvailabilityRequest) GetStartTime() string`

GetStartTime returns the StartTime field if non-nil, zero value otherwise.

### GetStartTimeOk

`func (o *AddAvailabilityRequest) GetStartTimeOk() (*string, bool)`

GetStartTimeOk returns a tuple with the StartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTime

`func (o *AddAvailabilityRequest) SetStartTime(v string)`

SetStartTime sets StartTime field to given value.


### GetEndTime

`func (o *AddAvailabilityRequest) GetEndTime() string`

GetEndTime returns the EndTime field if non-nil, zero value otherwise.

### GetEndTimeOk

`func (o *AddAvailabilityRequest) GetEndTimeOk() (*string, bool)`

GetEndTimeOk returns a tuple with the EndTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndTime

`func (o *AddAvailabilityRequest) SetEndTime(v string)`

SetEndTime sets EndTime field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


