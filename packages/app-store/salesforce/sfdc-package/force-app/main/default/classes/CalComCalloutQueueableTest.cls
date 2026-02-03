@isTest
private class CalComCalloutQueueableTest {

    @isTest
    static void testQueueableExecutionSuccess() {
        CalComHttpMock.resetState();
        
        List<CalComCalloutQueueable.UserChangePayload> payloads = createTestPayloads(1);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock(200, '{"success": true}'));

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assertEquals(1, CalComHttpMock.getCallCount(), 'Expected exactly one HTTP callout');
        List<HttpRequest> requests = CalComHttpMock.getCapturedRequests();
        System.assertEquals(1, requests.size(), 'Expected one captured request');
        System.assertEquals('POST', requests[0].getMethod(), 'Request method should be POST');
    }

    @isTest
    static void testQueueableExecutionWithMultiplePayloads() {
        CalComHttpMock.resetState();
        
        List<CalComCalloutQueueable.UserChangePayload> payloads = createTestPayloads(3);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock(200, '{"success": true}'));

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assertEquals(3, CalComHttpMock.getCallCount(), 'Expected three HTTP callouts for three payloads');
    }

    @isTest
    static void testQueueableExecutionFailureResponse() {
        CalComHttpMock.resetState();
        
        List<CalComCalloutQueueable.UserChangePayload> payloads = createTestPayloads(1);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock(500, '{"error": "Internal Server Error"}'));

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assertEquals(1, CalComHttpMock.getCallCount(), 'Expected HTTP callout even for failure response');
    }

    @isTest
    static void testQueueableExecutionEmptyPayloads() {
        CalComHttpMock.resetState();
        
        List<CalComCalloutQueueable.UserChangePayload> payloads = new List<CalComCalloutQueueable.UserChangePayload>();

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock());

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assertEquals(0, CalComHttpMock.getCallCount(), 'Expected no HTTP callouts with empty payloads');
    }

    @isTest
    static void testUserChangePayloadStructure() {
        CalComCalloutQueueable.UserChangePayload payload = new CalComCalloutQueueable.UserChangePayload();
        payload.salesforceUserId = UserInfo.getUserId();
        payload.email = 'test@example.com';
        payload.instanceUrl = 'https://test.salesforce.com';
        payload.orgId = UserInfo.getOrganizationId();
        payload.changedFields = new Map<String, Object>{'FirstName' => 'Test'};
        payload.timestamp = Datetime.now().formatGMT('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');

        System.assertNotEquals(null, payload.salesforceUserId, 'salesforceUserId should be set');
        System.assertEquals('test@example.com', payload.email, 'email should match');
        System.assertNotEquals(null, payload.instanceUrl, 'instanceUrl should be set');
        System.assertNotEquals(null, payload.orgId, 'orgId should be set');
        System.assertEquals(1, payload.changedFields.size(), 'changedFields should have one entry');
        System.assertNotEquals(null, payload.timestamp, 'timestamp should be set');
    }

    private static List<CalComCalloutQueueable.UserChangePayload> createTestPayloads(Integer count) {
        List<CalComCalloutQueueable.UserChangePayload> payloads = new List<CalComCalloutQueueable.UserChangePayload>();

        for (Integer i = 0; i < count; i++) {
            CalComCalloutQueueable.UserChangePayload payload = new CalComCalloutQueueable.UserChangePayload();
            payload.salesforceUserId = UserInfo.getUserId();
            payload.email = 'test' + i + '@example.com';
            payload.instanceUrl = URL.getOrgDomainUrl().toExternalForm();
            payload.orgId = UserInfo.getOrganizationId();
            payload.changedFields = new Map<String, Object>{
                'FirstName' => 'TestFirst' + i,
                'LastName' => 'TestLast' + i
            };
            payload.timestamp = Datetime.now().formatGMT('yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'');
            payloads.add(payload);
        }

        return payloads;
    }
}
