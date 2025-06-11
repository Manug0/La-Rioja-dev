/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 05-26-2025
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
**/
public with sharing class HSU_PersonDetailControl {
    @AuraEnabled
    public static HSU_PersonaDTO getPerson(String token, String recordId){
        List<Account> listAccount=[SELECT Id,FirstName,MiddleName,LastName,AccountNumber,SourceSystemIdentifier FROM Account WHERE Id=:recordId LIMIT 1];
        if(listAccount.isEmpty()){
            throw new AuraHandledException('No se encuentra el cliente');
        }
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:HSU_CEX/personas/info/'+listAccount[0].SourceSystemIdentifier);
        req.setMethod('GET');
        req.setHeader('cex-wso2', token);
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('accept', 'application/json');
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            System.debug(res.getBody());
            HSU_PersonaDTO persona=(HSU_PersonaDTO) JSON.deserialize(res.getBody(), HSU_PersonaDTO.class);
            return persona;
        } else {
            throw new AuraHandledException('Error al obtener personas. Código: ' + res.getStatusCode());
        }
    }
}