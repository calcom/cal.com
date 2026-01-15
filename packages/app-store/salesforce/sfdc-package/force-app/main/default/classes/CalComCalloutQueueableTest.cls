@isTest
private class CalComCalloutQueueableTest {

    @isTest
    static void testQueueableExecutionSuccess() {
        List<CalComCalloutQueueable.UserChangePayload> payloads = createTestPayloads(1);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock(200, '{"success": true}'));

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assert(true, 'Queueable executed without exceptions');
    }

    @isTest
    static void testQueueableExecutionWithMultiplePayloads() {
        List<CalComCalloutQueueable.UserChangePayload> payloads = createTestPayloads(3);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock(200, '{"success": true}'));

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assert(true, 'Queueable executed with multiple payloads without exceptions');
    }

    @isTest
    static void testQueueableExecutionFailureResponse() {
        List<CalComCalloutQueueable.UserChangePayload> payloads = createTestPayloads(1);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock(500, '{"error": "Internal Server Error"}'));

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assert(true, 'Queueable handled failure response without throwing exception');
    }

    @isTest
    static void testQueueableExecutionEmptyPayloads() {
        List<CalComCalloutQueueable.UserChangePayload> payloads = new List<CalComCalloutQueueable.UserChangePayload>();

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock());

        Test.startTest();
        CalComCalloutQueueable queueable = new CalComCalloutQueueable(payloads);
        System.enqueueJob(queueable);
        Test.stopTest();

        System.assert(true, 'Queueable executed with empty payloads without exceptions');
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
