@isTest
private class UserUpdateHandlerTest {

    @isTest
    static void testHandleAfterUpdateWithChangedFields() {
        CalComHttpMock.resetState();
        
        User testUser = [SELECT Id, FirstName, LastName, Email FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];

        Map<Id, User> oldMap = new Map<Id, User>();
        Map<Id, User> newMap = new Map<Id, User>();

        User oldUser = testUser.clone(true, true, true, true);
        oldUser.FirstName = 'OldFirstName';

        User newUser = testUser.clone(true, true, true, true);
        newUser.FirstName = 'NewFirstName';

        oldMap.put(testUser.Id, oldUser);
        newMap.put(testUser.Id, newUser);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock());

        Test.startTest();
        UserUpdateHandler.handleAfterUpdate(oldMap, newMap);
        Test.stopTest();

        System.assertEquals(1, CalComHttpMock.getCallCount(), 'Expected exactly one HTTP callout for changed fields');
        List<HttpRequest> requests = CalComHttpMock.getCapturedRequests();
        System.assertEquals(1, requests.size(), 'Expected one captured request');
        System.assert(requests[0].getBody().contains('changedFields'), 'Request body should contain changedFields');
    }

    @isTest
    static void testHandleAfterUpdateWithNoChanges() {
        CalComHttpMock.resetState();
        
        User testUser = [SELECT Id, FirstName, LastName, Email FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];

        Map<Id, User> oldMap = new Map<Id, User>();
        Map<Id, User> newMap = new Map<Id, User>();

        oldMap.put(testUser.Id, testUser);
        newMap.put(testUser.Id, testUser);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock());

        Test.startTest();
        UserUpdateHandler.handleAfterUpdate(oldMap, newMap);
        Test.stopTest();

        System.assertEquals(0, CalComHttpMock.getCallCount(), 'Expected no HTTP callouts when no fields changed');
    }

    @isTest
    static void testHandleAfterUpdateWithMultipleUsers() {
        CalComHttpMock.resetState();
        
        List<User> testUsers = [SELECT Id, FirstName, LastName, Email FROM User WHERE IsActive = true LIMIT 2];

        if (testUsers.size() < 2) {
            System.assert(true, 'Not enough users to test multiple user scenario');
            return;
        }

        Map<Id, User> oldMap = new Map<Id, User>();
        Map<Id, User> newMap = new Map<Id, User>();

        for (User u : testUsers) {
            User oldUser = u.clone(true, true, true, true);
            oldUser.FirstName = 'Old' + u.FirstName;

            User newUser = u.clone(true, true, true, true);
            newUser.FirstName = 'New' + u.FirstName;

            oldMap.put(u.Id, oldUser);
            newMap.put(u.Id, newUser);
        }

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock());

        Test.startTest();
        UserUpdateHandler.handleAfterUpdate(oldMap, newMap);
        Test.stopTest();

        System.assertEquals(testUsers.size(), CalComHttpMock.getCallCount(), 'Expected HTTP callouts for each user with changed fields');
    }

    @isTest
    static void testHandleAfterUpdateWithMultipleFieldChanges() {
        CalComHttpMock.resetState();
        
        User testUser = [SELECT Id, FirstName, LastName, Email, Title, Department FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1];

        Map<Id, User> oldMap = new Map<Id, User>();
        Map<Id, User> newMap = new Map<Id, User>();

        User oldUser = testUser.clone(true, true, true, true);
        oldUser.FirstName = 'OldFirst';
        oldUser.LastName = 'OldLast';
        oldUser.Title = 'Old Title';

        User newUser = testUser.clone(true, true, true, true);
        newUser.FirstName = 'NewFirst';
        newUser.LastName = 'NewLast';
        newUser.Title = 'New Title';

        oldMap.put(testUser.Id, oldUser);
        newMap.put(testUser.Id, newUser);

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock());

        Test.startTest();
        UserUpdateHandler.handleAfterUpdate(oldMap, newMap);
        Test.stopTest();

        System.assertEquals(1, CalComHttpMock.getCallCount(), 'Expected exactly one HTTP callout for multiple field changes');
        List<HttpRequest> requests = CalComHttpMock.getCapturedRequests();
        System.assertEquals(1, requests.size(), 'Expected one captured request');
        String requestBody = requests[0].getBody();
        System.assert(requestBody.contains('FirstName'), 'Request body should contain FirstName field');
        System.assert(requestBody.contains('LastName'), 'Request body should contain LastName field');
    }

    @isTest
    static void testHandleAfterUpdateWithEmptyMaps() {
        CalComHttpMock.resetState();
        
        Map<Id, User> oldMap = new Map<Id, User>();
        Map<Id, User> newMap = new Map<Id, User>();

        Test.setMock(HttpCalloutMock.class, new CalComHttpMock());

        Test.startTest();
        UserUpdateHandler.handleAfterUpdate(oldMap, newMap);
        Test.stopTest();

        System.assertEquals(0, CalComHttpMock.getCallCount(), 'Expected no HTTP callouts with empty maps');
    }
}
