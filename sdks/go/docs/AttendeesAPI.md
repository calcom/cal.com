# \AttendeesAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddAttendee**](AttendeesAPI.md#AddAttendee) | **Post** /attendees | Creates a new attendee
[**EditAttendeeById**](AttendeesAPI.md#EditAttendeeById) | **Patch** /attendees/{id} | Edit an existing attendee
[**GetAttendeeById**](AttendeesAPI.md#GetAttendeeById) | **Get** /attendees/{id} | Find an attendee
[**ListAttendees**](AttendeesAPI.md#ListAttendees) | **Get** /attendees | Find all attendees
[**RemoveAttendeeById**](AttendeesAPI.md#RemoveAttendeeById) | **Delete** /attendees/{id} | Remove an existing attendee



## AddAttendee

> AddAttendee(ctx).ApiKey(apiKey).AddAttendeeRequest(addAttendeeRequest).Execute()

Creates a new attendee

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
    addAttendeeRequest := *openapiclient.NewAddAttendeeRequest(float32(123), "Email_example", "Name_example", "TimeZone_example") // AddAttendeeRequest | Create a new attendee related to one of your bookings

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AttendeesAPI.AddAttendee(context.Background()).ApiKey(apiKey).AddAttendeeRequest(addAttendeeRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AttendeesAPI.AddAttendee``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddAttendeeRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **addAttendeeRequest** | [**AddAttendeeRequest**](AddAttendeeRequest.md) | Create a new attendee related to one of your bookings | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## EditAttendeeById

> EditAttendeeById(ctx, id).ApiKey(apiKey).EditAttendeeByIdRequest(editAttendeeByIdRequest).Execute()

Edit an existing attendee

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
    id := int32(56) // int32 | ID of the attendee to get
    editAttendeeByIdRequest := *openapiclient.NewEditAttendeeByIdRequest() // EditAttendeeByIdRequest | Edit an existing attendee related to one of your bookings

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AttendeesAPI.EditAttendeeById(context.Background(), id).ApiKey(apiKey).EditAttendeeByIdRequest(editAttendeeByIdRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AttendeesAPI.EditAttendeeById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the attendee to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiEditAttendeeByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 

 **editAttendeeByIdRequest** | [**EditAttendeeByIdRequest**](EditAttendeeByIdRequest.md) | Edit an existing attendee related to one of your bookings | 

### Return type

 (empty response body)

### Authorization

[ApiKeyAuth](../README.md#ApiKeyAuth)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## GetAttendeeById

> GetAttendeeById(ctx, id).ApiKey(apiKey).Execute()

Find an attendee

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
    id := int32(56) // int32 | ID of the attendee to get

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AttendeesAPI.GetAttendeeById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AttendeesAPI.GetAttendeeById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the attendee to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetAttendeeByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 


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


## ListAttendees

> ListAttendees(ctx).ApiKey(apiKey).Execute()

Find all attendees

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

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AttendeesAPI.ListAttendees(context.Background()).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AttendeesAPI.ListAttendees``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListAttendeesRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 

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


## RemoveAttendeeById

> RemoveAttendeeById(ctx, id).ApiKey(apiKey).Execute()

Remove an existing attendee

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
    id := int32(56) // int32 | ID of the attendee to delete

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.AttendeesAPI.RemoveAttendeeById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `AttendeesAPI.RemoveAttendeeById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the attendee to delete | 

### Other Parameters

Other parameters are passed through a pointer to a apiRemoveAttendeeByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 


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

