# AddAttendeeRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**BookingId** | **float32** |  | 
**Email** | **string** |  | 
**Name** | **string** |  | 
**TimeZone** | **string** |  | 

## Methods

### NewAddAttendeeRequest

`func NewAddAttendeeRequest(bookingId float32, email string, name string, timeZone string, ) *AddAttendeeRequest`

NewAddAttendeeRequest instantiates a new AddAttendeeRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddAttendeeRequestWithDefaults

`func NewAddAttendeeRequestWithDefaults() *AddAttendeeRequest`

NewAddAttendeeRequestWithDefaults instantiates a new AddAttendeeRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetBookingId

`func (o *AddAttendeeRequest) GetBookingId() float32`

GetBookingId returns the BookingId field if non-nil, zero value otherwise.

### GetBookingIdOk

`func (o *AddAttendeeRequest) GetBookingIdOk() (*float32, bool)`

GetBookingIdOk returns a tuple with the BookingId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBookingId

`func (o *AddAttendeeRequest) SetBookingId(v float32)`

SetBookingId sets BookingId field to given value.


### GetEmail

`func (o *AddAttendeeRequest) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *AddAttendeeRequest) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *AddAttendeeRequest) SetEmail(v string)`

SetEmail sets Email field to given value.


### GetName

`func (o *AddAttendeeRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *AddAttendeeRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *AddAttendeeRequest) SetName(v string)`

SetName sets Name field to given value.


### GetTimeZone

`func (o *AddAttendeeRequest) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *AddAttendeeRequest) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *AddAttendeeRequest) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


