public with sharing class HSU_SuggestionController {
    @AuraEnabled
    public static void createIncident(String subject, String descriptionHtml, String recordTypeDeveloperName) {
        if (String.isBlank(subject) || String.isBlank(descriptionHtml)) {
            throw new AuraHandledException('Debes completar todos los campos.');
        }

        Id rtId = [SELECT Id FROM RecordType WHERE SObjectType = 'Incident' AND DeveloperName = :recordTypeDeveloperName LIMIT 1].Id;

        Incident nuevo = new Incident();
        nuevo.Subject = subject;
        nuevo.HSU_Description__c = descriptionHtml;
        nuevo.RecordTypeId = rtId;

        insert nuevo;
    }

}
