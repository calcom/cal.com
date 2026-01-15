@isTest
public class CalComHttpMock implements HttpCalloutMock {

    private Integer statusCode;
    private String responseBody;

    public CalComHttpMock(Integer statusCode, String responseBody) {
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public CalComHttpMock() {
        this.statusCode = 200;
        this.responseBody = '{"success": true}';
    }

    public HttpResponse respond(HttpRequest req) {
        HttpResponse res = new HttpResponse();
        res.setStatusCode(this.statusCode);
        res.setBody(this.responseBody);
        res.setHeader('Content-Type', 'application/json');
        return res;
    }
}
