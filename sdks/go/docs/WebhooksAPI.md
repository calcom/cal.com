# \WebhooksAPI

All URIs are relative to *http://localhost:3002/v1*

Method | HTTP request | Description
------------- | ------------- | -------------
[**AddWebhook**](WebhooksAPI.md#AddWebhook) | **Post** /webhooks | Creates a new webhook
[**EditWebhookById**](WebhooksAPI.md#EditWebhookById) | **Patch** /webhooks/{id} | Edit an existing webhook
[**GetWebhookById**](WebhooksAPI.md#GetWebhookById) | **Get** /webhooks/{id} | Find a webhook
[**ListWebhooks**](WebhooksAPI.md#ListWebhooks) | **Get** /webhooks | Find all webhooks
[**RemoveWebhookById**](WebhooksAPI.md#RemoveWebhookById) | **Delete** /webhooks/{id} | Remove an existing hook



## AddWebhook

> AddWebhook(ctx).ApiKey(apiKey).AddWebhookRequest(addWebhookRequest).Execute()

Creates a new webhook

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
    addWebhookRequest := *openapiclient.NewAddWebhookRequest("SubscriberUrl_example", "EventTriggers_example", false) // AddWebhookRequest | Create a new webhook

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.WebhooksAPI.AddWebhook(context.Background()).ApiKey(apiKey).AddWebhookRequest(addWebhookRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.AddWebhook``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiAddWebhookRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **apiKey** | **string** | Your API key | 
 **addWebhookRequest** | [**AddWebhookRequest**](AddWebhookRequest.md) | Create a new webhook | 

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


## EditWebhookById

> EditWebhookById(ctx, id).ApiKey(apiKey).EditWebhookByIdRequest(editWebhookByIdRequest).Execute()

Edit an existing webhook

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
    id := int32(56) // int32 | Numeric ID of the webhook to edit
    apiKey := "apiKey_example" // string | Your API key
    editWebhookByIdRequest := *openapiclient.NewEditWebhookByIdRequest() // EditWebhookByIdRequest | Edit an existing webhook

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.WebhooksAPI.EditWebhookById(context.Background(), id).ApiKey(apiKey).EditWebhookByIdRequest(editWebhookByIdRequest).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.EditWebhookById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | Numeric ID of the webhook to edit | 

### Other Parameters

Other parameters are passed through a pointer to a apiEditWebhookByIdRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **apiKey** | **string** | Your API key | 
 **editWebhookByIdRequest** | [**EditWebhookByIdRequest**](EditWebhookByIdRequest.md) | Edit an existing webhook | 

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


## GetWebhookById

> GetWebhookById(ctx, id).ApiKey(apiKey).Execute()

Find a webhook

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
    id := int32(56) // int32 | Numeric ID of the webhook to get
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.WebhooksAPI.GetWebhookById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.GetWebhookById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | Numeric ID of the webhook to get | 

### Other Parameters

Other parameters are passed through a pointer to a apiGetWebhookByIdRequest struct via the builder pattern


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


## ListWebhooks

> ListWebhooks(ctx).ApiKey(apiKey).Execute()

Find all webhooks

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
    r, err := apiClient.WebhooksAPI.ListWebhooks(context.Background()).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.ListWebhooks``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiListWebhooksRequest struct via the builder pattern


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


## RemoveWebhookById

> RemoveWebhookById(ctx, id).ApiKey(apiKey).Execute()

Remove an existing hook

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
    id := int32(56) // int32 | Numeric ID of the hooks to delete
    apiKey := "apiKey_example" // string | Your API key

    configuration := openapiclient.NewConfiguration()
    apiClient := openapiclient.NewAPIClient(configuration)
    r, err := apiClient.WebhooksAPI.RemoveWebhookById(context.Background(), id).ApiKey(apiKey).Execute()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error when calling `WebhooksAPI.RemoveWebhookById``: %v\n", err)
        fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
    }
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **int32** | Numeric ID of the hooks to delete | 

### Other Parameters

Other parameters are passed through a pointer to a apiRemoveWebhookByIdRequest struct via the builder pattern


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

