# AddBookingRequestResponses

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** | Attendee full name | 
**Email** | **string** | Attendee email address | 
**Location** | [**AddBookingRequestResponsesLocation**](AddBookingRequestResponsesLocation.md) |  | 

## Methods

### NewAddBookingRequestResponses

`func NewAddBookingRequestResponses(name string, email string, location AddBookingRequestResponsesLocation, ) *AddBookingRequestResponses`

NewAddBookingRequestResponses instantiates a new AddBookingRequestResponses object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewAddBookingRequestResponsesWithDefaults

`func NewAddBookingRequestResponsesWithDefaults() *AddBookingRequestResponses`

NewAddBookingRequestResponsesWithDefaults instantiates a new AddBookingRequestResponses object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *AddBookingRequestResponses) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *AddBookingRequestResponses) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *AddBookingRequestResponses) SetName(v string)`

SetName sets Name field to given value.


### GetEmail

`func (o *AddBookingRequestResponses) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *AddBookingRequestResponses) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *AddBookingRequestResponses) SetEmail(v string)`

SetEmail sets Email field to given value.


### GetLocation

`func (o *AddBookingRequestResponses) GetLocation() AddBookingRequestResponsesLocation`

GetLocation returns the Location field if non-nil, zero value otherwise.

### GetLocationOk

`func (o *AddBookingRequestResponses) GetLocationOk() (*AddBookingRequestResponsesLocation, bool)`

GetLocationOk returns a tuple with the Location field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLocation

`func (o *AddBookingRequestResponses) SetLocation(v AddBookingRequestResponsesLocation)`

SetLocation sets Location field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


