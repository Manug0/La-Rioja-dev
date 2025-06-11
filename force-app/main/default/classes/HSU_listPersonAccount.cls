/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 05-20-2025
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
 * Modifications Log
 * Ver   Date         Author                               Modification
 * 1.0   05-09-2025   ChangeMeIn@UserSettingsUnder.SFDoc   Initial Version
**/
public with sharing class HSU_listPersonAccount {
    @AuraEnabled(cacheable=false)
    public static List<HSU_PersonaDTO> getPersonas(String token, Map<Object,Object> body) {
        Http http = new Http();
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://hsu-mock-api.onrender.com/personas/listar');
        req.setMethod('POST');
        req.setHeader('cex-wso2', token);
        req.setHeader('Content-Type', 'application/json');
        String bodyString = JSON.serialize(body);
        req.setBody(bodyString);

        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            System.debug(res.getBody());

            return (List<HSU_PersonaDTO>) JSON.deserialize(res.getBody(), List<HSU_PersonaDTO>.class);
        } else {
            throw new AuraHandledException('Error al obtener personas. Código: ' + res.getStatusCode());
        }
    }
    @AuraEnabled(cacheable=false)
    public static String upsertAccountWithPerson(String json_pDTO) {
        // Parsear el JSON al objeto HSU_PersonaDTO
        HSU_PersonaDTO persona = (HSU_PersonaDTO)JSON.deserializeStrict(json_pDTO,HSU_PersonaDTO.class);

        // Busca si ya existe una cuenta con ese AccountNumber
        List<Account> accounts = [SELECT Id FROM Account WHERE AccountNumber = :persona.idRus LIMIT 1 ];
        
        if (!accounts.isEmpty()) {
            // Ya existe, puedes devolver el Id o un mensaje
            return accounts[0].Id;
        }
        
        // Crea la cuenta con los datos de la persona
        Id recordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('PersonAccount').getRecordTypeId();

        Account acc = new Account();
        acc.RecordTypeId=recordTypeId;
        acc.AccountNumber = persona.dni;
        acc.FirstName = persona.nombre;
        acc.MiddleName=persona.apellido1;
        acc.LastName=persona.apellido2;
        acc.PersonEmail = persona.mail;
        acc.SourceSystemIdentifier=persona.idRus;
        
        insert acc;
        return acc.Id;
    }
}