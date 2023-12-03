# \CustomInputsAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**CustomInputsGet**](CustomInputsAPI.md#CustomInputsGet) | **Get** /custom-inputs | Find all eventTypeCustomInputs
[**CustomInputsIdDelete**](CustomInputsAPI.md#CustomInputsIdDelete) | **Delete** /custom-inputs/{id} | Remove an existing eventTypeCustomInput
[**CustomInputsIdGet**](CustomInputsAPI.md#CustomInputsIdGet) | **Get** /custom-inputs/{id} | Find a eventTypeCustomInput
[**CustomInputsIdPatch**](CustomInputsAPI.md#CustomInputsIdPatch) | **Patch** /custom-inputs/{id} | Edit an existing eventTypeCustomInput
[**CustomInputsPost**](CustomInputsAPI.md#CustomInputsPost) | **Post** /custom-inputs | Creates a new eventTypeCustomInput



## CustomInputsGet

> CustomInputsGet(ctx).ApiKey(apiKey).Execute()

Find all eventTypeCustomInputs

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
    r, err := apiClient.CustomInputsAPI.CustomInputsGet(context.Background()).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CustomInputsAPI.CustomInputsGet``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCustomInputsGetRequest struct via the builder pattern


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


## CustomInputsIdDelete

> CustomInputsIdDelete(ctx, id).ApiKey(apiKey).Execute()

Remove an existing eventTypeCustomInput

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
    id := int32(56) // int32 | ID of the eventTypeCustomInput to delete
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.CustomInputsAPI.CustomInputsIdDelete(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CustomInputsAPI.CustomInputsIdDelete``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the eventTypeCustomInput to delete | 

### Other Parameters

Other parameters are passed through a pointer to a apiCustomInputsIdDeleteRequest struct via the builder pattern


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


## CustomInputsIdGet

> CustomInputsIdGet(ctx, id).ApiKey(apiKey).Execute()

Find a eventTypeCustomInput

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
    id := int32(56) // int32 | ID of the eventTypeCustomInput to get
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.CustomInputsAPI.CustomInputsIdGet(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CustomInputsAPI.CustomInputsIdGet``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the eventTypeCustomInput to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiCustomInputsIdGetRequest struct via the builder pattern


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


## CustomInputsIdPatch

> CustomInputsIdPatch(ctx, id).ApiKey(apiKey).CustomInputsIdPatchRequest(customInputsIdPatchRequest).Execute()

Edit an existing eventTypeCustomInput

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
    id := int32(56) // int32 | ID of the eventTypeCustomInput to edit
    apiKey := "apiKey_example" // string | Your API key
    customInputsIdPatchRequest := *openapiclient.NewCustomInputsIdPatchRequest() // CustomInputsIdPatchRequest | Edit an existing eventTypeCustomInput for an event type

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.CustomInputsAPI.CustomInputsIdPatch(context.Background(), id).ApiKey(apiKey).CustomInputsIdPatchRequest(customInputsIdPatchRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CustomInputsAPI.CustomInputsIdPatch``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | ID of the eventTypeCustomInput to edit | 

### Other Parameters

Other parameters are passed through a pointer to a apiCustomInputsIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **string** | Your API key | 
 **customInputsIdPatchRequest** | [**CustomInputsIdPatchRequest**](CustomInputsIdPatchRequest.md) | Edit an existing eventTypeCustomInput for an event type | 

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


## CustomInputsPost

> CustomInputsPost(ctx).ApiKey(apiKey).CustomInputsPostRequest(customInputsPostRequest).Execute()

Creates a new eventTypeCustomInput

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
    customInputsPostRequest := *openapiclient.NewCustomInputsPostRequest(int32(123), "Label_example", "Type_example", false, "Placeholder_example") // CustomInputsPostRequest | Create a new custom input for an event type

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.CustomInputsAPI.CustomInputsPost(context.Background()).ApiKey(apiKey).CustomInputsPostRequest(customInputsPostRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `CustomInputsAPI.CustomInputsPost``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCustomInputsPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **customInputsPostRequest** | [**CustomInputsPostRequest**](CustomInputsPostRequest.md) | Create a new custom input for an event type | 

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

