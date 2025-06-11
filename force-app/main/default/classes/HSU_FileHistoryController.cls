/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 05-26-2025
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
 * Modifications Log
 * Ver   Date         Author                               Modification
 * 1.0   05-13-2025   ChangeMeIn@UserSettingsUnder.SFDoc   Initial Version
**/
public with sharing class HSU_FileHistoryController {
    @AuraEnabled
    public static List<HSU_HistoricoDTO> getHistorial(String token) {
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:HSU_CEX/gestor/historial');
        req.setMethod('GET');
        req.setHeader('cex-wso2', token);
        req.setHeader('Content-Type', 'application/json');

        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            return (List<HSU_HistoricoDTO>) JSON.deserialize(res.getBody(), List<HSU_HistoricoDTO>.class);
        } else {
            throw new AuraHandledException('Error al obtener el historial. Código: ' + res.getStatusCode());
        }
    }
    @AuraEnabled
    public static string handleUpsertExpediente(String token, String jsonExpediente){
        HSU_HistoricoDTO historyExp = (HSU_HistoricoDTO) JSON.deserialize(jsonExpediente, HSU_HistoricoDTO.class);
        List<Case> caseList = [SELECT Id FROM Case WHERE HSU_COBE__c=:historyExp.cobe];
        if(!caseList.isEmpty()){
            return caseList[0].Id;
        }
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:HSU_CEX/expedientes/consulta');
        req.setMethod('POST');
        req.setHeader('cex-wso2', token);
        req.setHeader('Content-Type', 'application/json');
        Map<String, String> body = new Map<String, String>{
            'sistema' => historyExp.sistema,
            'cobe' => historyExp.cobe
        };
        req.setBody(JSON.serialize(body));

        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            HSU_ExpedienteDTO expediente=(HSU_ExpedienteDTO) JSON.deserialize(res.getBody(), HSU_ExpedienteDTO.class);
            //Debemos verificar si el cliente
            String idAccount;
            if(expediente!=null && expediente.persona!=null && expediente.persona.idRus!=null) {
                List<Account> accList = [SELECT Id FROM Account WHERE SourceSystemIdentifier=:expediente.persona.idRus];
                if(accList.isEmpty()){
                    Id recordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('PersonAccount').getRecordTypeId();
                    Account acc = new Account();
                    acc.RecordTypeId=recordTypeId;
                    acc.AccountNumber = expediente.persona.dni;
                    acc.FirstName = expediente.persona.nombre;
                    acc.MiddleName=expediente.persona.apellido1;
                    acc.LastName=expediente.persona.apellido2;
                    acc.PersonEmail = expediente.persona.mail;
                    acc.SourceSystemIdentifier=expediente.persona.idRus;
        
                    insert acc;
                    idAccount=acc.Id;
                }else{
                    idAccount=accList[0].Id;
                }
            }
            
            Case caso = new Case(
                AccountId=idAccount,
                HSU_COBE__c=expediente.cobe,
                HSU_Expediente__c=expediente.numeroExpediente,
                Origin=expediente.sistema);
            insert caso;
            return caso.Id;
        } else {
                throw new AuraHandledException('Error al obtener expediente. Código: ' + res.getStatusCode());
        }
    }
}