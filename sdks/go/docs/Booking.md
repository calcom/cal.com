# Booking

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | Pointer to **float32** |  | [optional] 
**Description** | Pointer to **string** |  | [optional] 
**EventTypeId** | Pointer to **float32** |  | [optional] 
**Uid** | Pointer to **string** |  | [optional] 
**Title** | Pointer to **string** |  | [optional] 
**StartTime** | Pointer to **time.Time** |  | [optional] 
**EndTime** | Pointer to **time.Time** |  | [optional] 
**TimeZone** | Pointer to **string** |  | [optional] 
**Attendees** | Pointer to [**[]BookingAttendeesInner**](BookingAttendeesInner.md) |  | [optional] 
**User** | Pointer to [**BookingAttendeesInner**](BookingAttendeesInner.md) |  | [optional] 
**Payment** | Pointer to [**[]BookingPaymentInner**](BookingPaymentInner.md) |  | [optional] 

## Methods

### NewBooking

`func NewBooking() *Booking`

NewBooking instantiates a new Booking object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewBookingWithDefaults

`func NewBookingWithDefaults() *Booking`

NewBookingWithDefaults instantiates a new Booking object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *Booking) GetId() float32`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *Booking) GetIdOk() (*float32, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *Booking) SetId(v float32)`

SetId sets Id field to given value.

### HasId

`func (o *Booking) HasId() bool`

HasId returns a boolean if a field has been set.

### GetDescription

`func (o *Booking) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *Booking) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *Booking) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *Booking) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### GetEventTypeId

`func (o *Booking) GetEventTypeId() float32`

GetEventTypeId returns the EventTypeId field if non-nil, zero value otherwise.

### GetEventTypeIdOk

`func (o *Booking) GetEventTypeIdOk() (*float32, bool)`

GetEventTypeIdOk returns a tuple with the EventTypeId field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventTypeId

`func (o *Booking) SetEventTypeId(v float32)`

SetEventTypeId sets EventTypeId field to given value.

### HasEventTypeId

`func (o *Booking) HasEventTypeId() bool`

HasEventTypeId returns a boolean if a field has been set.

### GetUid

`func (o *Booking) GetUid() string`

GetUid returns the Uid field if non-nil, zero value otherwise.

### GetUidOk

`func (o *Booking) GetUidOk() (*string, bool)`

GetUidOk returns a tuple with the Uid field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUid

`func (o *Booking) SetUid(v string)`

SetUid sets Uid field to given value.

### HasUid

`func (o *Booking) HasUid() bool`

HasUid returns a boolean if a field has been set.

### GetTitle

`func (o *Booking) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *Booking) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *Booking) SetTitle(v string)`

SetTitle sets Title field to given value.

### HasTitle

`func (o *Booking) HasTitle() bool`

HasTitle returns a boolean if a field has been set.

### GetStartTime

`func (o *Booking) GetStartTime() time.Time`

GetStartTime returns the StartTime field if non-nil, zero value otherwise.

### GetStartTimeOk

`func (o *Booking) GetStartTimeOk() (*time.Time, bool)`

GetStartTimeOk returns a tuple with the StartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTime

`func (o *Booking) SetStartTime(v time.Time)`

SetStartTime sets StartTime field to given value.

### HasStartTime

`func (o *Booking) HasStartTime() bool`

HasStartTime returns a boolean if a field has been set.

### GetEndTime

`func (o *Booking) GetEndTime() time.Time`

GetEndTime returns the EndTime field if non-nil, zero value otherwise.

### GetEndTimeOk

`func (o *Booking) GetEndTimeOk() (*time.Time, bool)`

GetEndTimeOk returns a tuple with the EndTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndTime

`func (o *Booking) SetEndTime(v time.Time)`

SetEndTime sets EndTime field to given value.

### HasEndTime

`func (o *Booking) HasEndTime() bool`

HasEndTime returns a boolean if a field has been set.

### GetTimeZone

`func (o *Booking) GetTimeZone() string`

GetTimeZone returns the TimeZone field if non-nil, zero value otherwise.

### GetTimeZoneOk

`func (o *Booking) GetTimeZoneOk() (*string, bool)`

GetTimeZoneOk returns a tuple with the TimeZone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimeZone

`func (o *Booking) SetTimeZone(v string)`

SetTimeZone sets TimeZone field to given value.

### HasTimeZone

`func (o *Booking) HasTimeZone() bool`

HasTimeZone returns a boolean if a field has been set.

### GetAttendees

`func (o *Booking) GetAttendees() []BookingAttendeesInner`

GetAttendees returns the Attendees field if non-nil, zero value otherwise.

### GetAttendeesOk

`func (o *Booking) GetAttendeesOk() (*[]BookingAttendeesInner, bool)`

GetAttendeesOk returns a tuple with the Attendees field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAttendees

`func (o *Booking) SetAttendees(v []BookingAttendeesInner)`

SetAttendees sets Attendees field to given value.

### HasAttendees

`func (o *Booking) HasAttendees() bool`

HasAttendees returns a boolean if a field has been set.

### GetUser

`func (o *Booking) GetUser() BookingAttendeesInner`

GetUser returns the User field if non-nil, zero value otherwise.

### GetUserOk

`func (o *Booking) GetUserOk() (*BookingAttendeesInner, bool)`

GetUserOk returns a tuple with the User field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUser

`func (o *Booking) SetUser(v BookingAttendeesInner)`

SetUser sets User field to given value.

### HasUser

`func (o *Booking) HasUser() bool`

HasUser returns a boolean if a field has been set.

### GetPayment

`func (o *Booking) GetPayment() []BookingPaymentInner`

GetPayment returns the Payment field if non-nil, zero value otherwise.

### GetPaymentOk

`func (o *Booking) GetPaymentOk() (*[]BookingPaymentInner, bool)`

GetPaymentOk returns a tuple with the Payment field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPayment

`func (o *Booking) SetPayment(v []BookingPaymentInner)`

SetPayment sets Payment field to given value.

### HasPayment

`func (o *Booking) HasPayment() bool`

HasPayment returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


