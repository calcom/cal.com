@isTest
public class CalComHttpMock implements HttpCalloutMock {

    private Integer statusCode;
    private String responseBody;
    
    private static Integer callCount = 0;
    private static List<HttpRequest> capturedRequests = new List<HttpRequest>();

    public CalComHttpMock(Integer statusCode, String responseBody) {
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public CalComHttpMock() {
        this.statusCode = 200;
        this.responseBody = '{"success": true}';
    }

    public HttpResponse respond(HttpRequest req) {
        callCount++;
        capturedRequests.add(req);
        
        HttpResponse res = new HttpResponse();
        res.setStatusCode(this.statusCode);
        res.setBody(this.responseBody);
        res.setHeader('Content-Type', 'application/json');
        return res;
    }
    
    public static Integer getCallCount() {
        return callCount;
    }
    
    public static List<HttpRequest> getCapturedRequests() {
        return capturedRequests;
    }
    
    public static void resetState() {
        callCount = 0;
        capturedRequests = new List<HttpRequest>();
    }
}
