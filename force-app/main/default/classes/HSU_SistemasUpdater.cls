public with sharing class HSU_SistemasUpdater {
    public class SistemaDTO {
        public String codigoSistema;
        public String descripcionSistema;
    }

    @InvocableMethod(label='Actualizar Sistemas')
    public static void updateSistemas() {
        String token = HSU_getSessionTokenControl.getSessionToken();
        
        try {
            Id recordTypeId = [SELECT Id FROM RecordType 
                              WHERE SObjectType = 'HSU_GlobalLists__c' 
                              AND DeveloperName = 'HSU_system' 
                              LIMIT 1].Id;

            Http http = new Http();
            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:HSU_CEX/maestros/sistemas');
            req.setMethod('GET');
            req.setHeader('cex-wso2', token);
            req.setHeader('Content-Type', 'application/json');
            req.setTimeout(60000);

            HttpResponse res = http.send(req);
            
            if (res.getStatusCode() == 200) {
                List<SistemaDTO> sistemas = (List<SistemaDTO>) JSON.deserialize(res.getBody(), List<SistemaDTO>.class);
                List<HSU_GlobalLists__c> toUpsert = new List<HSU_GlobalLists__c>();

                for (SistemaDTO sistema : sistemas) {
                    toUpsert.add(new HSU_GlobalLists__c(
                        HSU_Id_CEX__c = sistema.codigoSistema,
                        Name = sistema.codigoSistema,
                        HSU_Label__c = sistema.descripcionSistema,
                        RecordTypeId = recordTypeId
                    ));
                }

                if (!toUpsert.isEmpty()) {
                    upsert toUpsert HSU_Id_CEX__c;
                    System.debug('Actualizados ' + toUpsert.size() + ' registros de Sistemas');
                }
            } else {
                throw new AuraHandledException('Error al obtener Sistemas');
            }
        } catch (Exception ex) {
            throw new AuraHandledException('Error al obtener Sistemas');
        }
    }
}

