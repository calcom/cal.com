# \BookingsAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddBooking**](BookingsAPI.md#AddBooking) | **Post** /bookings | Creates a new booking
[**CancelBookingById**](BookingsAPI.md#CancelBookingById) | **Delete** /bookings/{id}/cancel | Booking cancellation
[**EditBookingById**](BookingsAPI.md#EditBookingById) | **Patch** /bookings/{id} | Edit an existing booking
[**GetBookingById**](BookingsAPI.md#GetBookingById) | **Get** /bookings/{id} | Find a booking
[**ListBookings**](BookingsAPI.md#ListBookings) | **Get** /bookings | Find all bookings



## AddBooking

> AddBooking(ctx).ApiKey(apiKey).AddBookingRequest(addBookingRequest).Execute()

Creates a new booking

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    "time"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API key
    addBookingRequest := *openapiclient.NewAddBookingRequest(int32(123), time.Now(), *openapiclient.NewAddBookingRequestResponses("Name_example", "Email_example", *openapiclient.NewAddBookingRequestResponsesLocation()), map[string]interface{}(123), "TimeZone_example", "Language_example") // AddBookingRequest | Create a new booking related to one of your event-types

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.BookingsAPI.AddBooking(context.Background()).ApiKey(apiKey).AddBookingRequest(addBookingRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingsAPI.AddBooking``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddBookingRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **addBookingRequest** | [**AddBookingRequest**](AddBookingRequest.md) | Create a new booking related to one of your event-types | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## CancelBookingById

> CancelBookingById(ctx, id).ApiKey(apiKey).AllRemainingBookings(allRemainingBookings).Reason(reason).Execute()

Booking cancellation

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    id := int32(56) // int32 | ID of the booking to cancel
    apiKey := "apiKey_example" // string | Your API key
    allRemainingBookings := true // bool | Delete all remaining bookings (optional)
    reason := "reason_example" // string | The reason for cancellation of the booking (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.BookingsAPI.CancelBookingById(context.Background(), id).ApiKey(apiKey).AllRemainingBookings(allRemainingBookings).Reason(reason).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingsAPI.CancelBookingById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the booking to cancel | 

### Other Parameters

Other parameters are passed through a pointer to a apiCancelBookingByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **string** | Your API key | 
 **allRemainingBookings** | **bool** | Delete all remaining bookings | 
 **reason** | **string** | The reason for cancellation of the booking | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EditBookingById

> EditBookingById(ctx, id).ApiKey(apiKey).EditBookingByIdRequest(editBookingByIdRequest).Execute()

Edit an existing booking

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "apiKey_example" // string | Your API key
    id := int32(56) // int32 | ID of the booking to edit
    editBookingByIdRequest := *openapiclient.NewEditBookingByIdRequest() // EditBookingByIdRequest | Edit an existing booking related to one of your event-types

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.BookingsAPI.EditBookingById(context.Background(), id).ApiKey(apiKey).EditBookingByIdRequest(editBookingByIdRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingsAPI.EditBookingById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the booking to edit | 

### Other Parameters

Other parameters are passed through a pointer to a apiEditBookingByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 

 **editBookingByIdRequest** | [**EditBookingByIdRequest**](EditBookingByIdRequest.md) | Edit an existing booking related to one of your event-types | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetBookingById

> Booking GetBookingById(ctx, id).ApiKey(apiKey).Execute()

Find a booking

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    id := int32(56) // int32 | ID of the booking to get
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.BookingsAPI.GetBookingById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingsAPI.GetBookingById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `GetBookingById`: Booking
    fmt.Fprintf(os.Stdout, "Response from `BookingsAPI.GetBookingById`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the booking to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetBookingByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **string** | Your API key | 

### Return type

[**Booking**](Booking.md)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## ListBookings

> []Booking ListBookings(ctx).ApiKey(apiKey).UserId(userId).AttendeeEmail(attendeeEmail).Execute()

Find all bookings

### Example

```go
package main

import (
    "context"
    "fmt"
    "os"
    openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {
    apiKey := "123456789abcdefgh" // string | Your API key
    userId := openapiclient.listBookings_userId_parameter{ArrayOfInt32: new([]int32)} // ListBookingsUserIdParameter |  (optional)
    attendeeEmail := openapiclient.listBookings_attendeeEmail_parameter{ArrayOfString: new([]string)} // ListBookingsAttendeeEmailParameter |  (optional)

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    resp, r, err := apiClient.BookingsAPI.ListBookings(context.Background()).ApiKey(apiKey).UserId(userId).AttendeeEmail(attendeeEmail).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingsAPI.ListBookings``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
    // response from `ListBookings`: []Booking
    fmt.Fprintf(os.Stdout, "Response from `BookingsAPI.ListBookings`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListBookingsRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **userId** | [**ListBookingsUserIdParameter**](ListBookingsUserIdParameter.md) |  | 
 **attendeeEmail** | [**ListBookingsAttendeeEmailParameter**](ListBookingsAttendeeEmailParameter.md) |  | 

### Return type

[**[]Booking**](Booking.md)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

