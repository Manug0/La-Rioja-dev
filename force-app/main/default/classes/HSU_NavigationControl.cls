/**
 * @description       : Controlador para manejar navegaciones y redirecciones
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @last modified on  : 05-28-2025
 */
public with sharing class HSU_NavigationControl {
    
    @AuraEnabled
    public static String getAccountIdByPersona(String json_pDTO) {
        try {
            System.debug('=== DEBUG getAccountIdByPersona ===');
            System.debug('JSON recibido: ' + json_pDTO);
            
            // Parsear el JSON al objeto HSU_PersonaDTO (igual que en HSU_listPersonAccount)
            HSU_PersonaDTO persona = (HSU_PersonaDTO)JSON.deserializeStrict(json_pDTO, HSU_PersonaDTO.class);
            System.debug('Persona parseada: ' + JSON.serialize(persona));
            
            // Busca si ya existe una cuenta con ese SourceSystemIdentifier (igual que en HSU_listPersonAccount)
            List<Account> accounts = [SELECT Id FROM Account WHERE SourceSystemIdentifier = :persona.idRus LIMIT 1];
            System.debug('Accounts encontradas: ' + accounts.size());
            
            if (!accounts.isEmpty()) {
                // Ya existe, devolver el Id
                System.debug('Account existente encontrada: ' + accounts[0].Id);
                return accounts[0].Id;
            }
            
            // Crea la cuenta con los datos de la persona (igual que en HSU_listPersonAccount)
            Id recordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('PersonAccount').getRecordTypeId();

            Account acc = new Account();
            acc.RecordTypeId = recordTypeId;
            acc.AccountNumber = persona.dni;
            acc.FirstName = persona.nombre;
            acc.MiddleName = persona.apellido1;
            acc.LastName = persona.apellido2;
            acc.PersonEmail = persona.mail;
            acc.SourceSystemIdentifier = persona.idRus;
            
            System.debug('Account a insertar: ' + JSON.serialize(acc));
            insert acc;
            System.debug('Nueva Account creada: ' + acc.Id);
            return acc.Id;
            
        } catch (Exception e) {
            System.debug('ERROR en getAccountIdByPersona: ' + e.getMessage());
            System.debug('Stack trace: ' + e.getStackTraceString());
            System.debug('Línea del error: ' + e.getLineNumber());
            throw new AuraHandledException('Error al obtener/crear cuenta de persona: ' + e.getMessage());
        }
    }
}