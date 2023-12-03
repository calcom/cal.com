# \BookingReferencesAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddBookingReference**](BookingReferencesAPI.md#AddBookingReference) | **Post** /booking-references | Creates a new  booking reference
[**EditBookingReferenceById**](BookingReferencesAPI.md#EditBookingReferenceById) | **Patch** /booking-references/{id} | Edit an existing booking reference
[**GetBookingReferenceById**](BookingReferencesAPI.md#GetBookingReferenceById) | **Get** /booking-references/{id} | Find a booking reference
[**ListBookingReferences**](BookingReferencesAPI.md#ListBookingReferences) | **Get** /booking-references | Find all booking references
[**RemoveBookingReferenceById**](BookingReferencesAPI.md#RemoveBookingReferenceById) | **Delete** /booking-references/{id} | Remove an existing booking reference



## AddBookingReference

> AddBookingReference(ctx).ApiKey(apiKey).AddBookingReferenceRequest(addBookingReferenceRequest).Execute()

Creates a new  booking reference

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
    addBookingReferenceRequest := *openapiclient.NewAddBookingReferenceRequest("Type_example", "Uid_example") // AddBookingReferenceRequest | Create a new booking reference related to one of your bookings

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.BookingReferencesAPI.AddBookingReference(context.Background()).ApiKey(apiKey).AddBookingReferenceRequest(addBookingReferenceRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingReferencesAPI.AddBookingReference``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddBookingReferenceRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **addBookingReferenceRequest** | [**AddBookingReferenceRequest**](AddBookingReferenceRequest.md) | Create a new booking reference related to one of your bookings | 

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


## EditBookingReferenceById

> EditBookingReferenceById(ctx, id).ApiKey(apiKey).EditBookingReferenceByIdRequest(editBookingReferenceByIdRequest).Execute()

Edit an existing booking reference

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
    id := int32(56) // int32 | ID of the booking reference to edit
    editBookingReferenceByIdRequest := *openapiclient.NewEditBookingReferenceByIdRequest() // EditBookingReferenceByIdRequest | Edit an existing booking reference related to one of your bookings

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.BookingReferencesAPI.EditBookingReferenceById(context.Background(), id).ApiKey(apiKey).EditBookingReferenceByIdRequest(editBookingReferenceByIdRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingReferencesAPI.EditBookingReferenceById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the booking reference to edit | 

### Other Parameters

Other parameters are passed through a pointer to a apiEditBookingReferenceByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 

 **editBookingReferenceByIdRequest** | [**EditBookingReferenceByIdRequest**](EditBookingReferenceByIdRequest.md) | Edit an existing booking reference related to one of your bookings | 

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


## GetBookingReferenceById

> GetBookingReferenceById(ctx, id).ApiKey(apiKey).Execute()

Find a booking reference

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
    id := int32(56) // int32 | ID of the booking reference to get
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.BookingReferencesAPI.GetBookingReferenceById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingReferencesAPI.GetBookingReferenceById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the booking reference to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetBookingReferenceByIdRequest struct via the builder pattern


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


## ListBookingReferences

> ListBookingReferences(ctx).ApiKey(apiKey).Execute()

Find all booking references

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
    r, err := apiClient.BookingReferencesAPI.ListBookingReferences(context.Background()).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingReferencesAPI.ListBookingReferences``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListBookingReferencesRequest struct via the builder pattern


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


## RemoveBookingReferenceById

> RemoveBookingReferenceById(ctx, id).ApiKey(apiKey).Execute()

Remove an existing booking reference

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
    id := int32(56) // int32 | ID of the booking reference to delete
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.BookingReferencesAPI.RemoveBookingReferenceById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `BookingReferencesAPI.RemoveBookingReferenceById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the booking reference to delete | 

### Other Parameters

Other parameters are passed through a pointer to a apiRemoveBookingReferenceByIdRequest struct via the builder pattern


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

