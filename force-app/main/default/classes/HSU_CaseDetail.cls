/**
 * @description       : Consulta de expediente mock
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @last modified on  : 05-26-2025
 */
public with sharing class HSU_CaseDetail {
    @AuraEnabled(cacheable=false)
    public static Map<String, Object> getExpediente(String token, String sistema, String recordId) {
        List<Case> listCases=[SELECT Id, HSU_Expediente__c,HSU_COBE__c,Origin FROM Case WHERE Id=:recordId];
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:HSU_CEX/expedientes/consulta');
        req.setMethod('POST');
        req.setHeader('cex-wso2', token);
        req.setHeader('Content-Type', 'application/json');
        Map<String, String> body = new Map<String, String>{
            'sistema' => listCases[0].Origin,
            'cobe' => listCases[0].HSU_COBE__c
        };
        req.setBody(JSON.serialize(body));

        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            System.debug('Expediente recibido: ' + res.getBody());
            return (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
        } else {
            System.debug('Error al obtener expediente: ' + res.getStatusCode() + ' - ' + res.getBody());
            throw new AuraHandledException('Error al obtener expediente. Código: ' + res.getStatusCode());
        }
        //o0
    }
}