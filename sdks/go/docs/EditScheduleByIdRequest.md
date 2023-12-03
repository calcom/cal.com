# EditScheduleByIdRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | Pointer to **string** | Name of the schedule | [optional] 
**TimeZone** | Pointer to **string** | The timezone for this schedule | [optional] 

## Methods

### NewEditScheduleByIdRequest

`func NewEditScheduleByIdRequest() *EditScheduleByIdRequest`

NewEditScheduleByIdRequest instantiates a new EditScheduleByIdRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewEditScheduleByIdRequestWithDefaults

`func NewEditScheduleByIdRequestWithDefaults() *EditScheduleByIdRequest`

NewEditScheduleByIdRequestWithDefaults instantiates a new EditScheduleByIdRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *EditScheduleByIdRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *EditScheduleByIdRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *EditScheduleByIdRequest) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *EditScheduleByIdRequest) HasName() bool`

HasName returns a boolean if a field has been set.

### GetTimeZone

`func (o *EditScheduleByIdRequest) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *EditScheduleByIdRequest) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *EditScheduleByIdRequest) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.

### HasTimeZone

`func (o *EditScheduleByIdRequest) HasTimeZone() bool`

HasTimeZone returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


