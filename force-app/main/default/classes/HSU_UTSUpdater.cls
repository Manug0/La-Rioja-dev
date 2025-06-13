public with sharing class HSU_UTSUpdater {
    public class UTSDTO {
        public String codigoUts;
        public String descripcionUts;
    }

    @InvocableMethod(label='Actualizar UTS')
    public static void updateUTS() {
        String token = HSU_getSessionTokenControl.getSessionToken();

        try {
            Id recordTypeId = [SELECT Id FROM RecordType 
                              WHERE SObjectType = 'HSU_GlobalLists__c' 
                              AND DeveloperName = 'HSU_UTS' 
                              LIMIT 1].Id;

            Http http = new Http();
            HttpRequest req = new HttpRequest();
            req.setEndpoint('callout:HSU_CEX/maestros/uts');
            req.setMethod('GET');
            req.setHeader('cex-wso2', token);
            req.setHeader('Content-Type', 'application/json');
            req.setTimeout(60000);

            HttpResponse res = http.send(req);
            
            if (res.getStatusCode() == 200) {
                List<UTSDTO> utsList = (List<UTSDTO>) JSON.deserialize(res.getBody(), List<UTSDTO>.class);
                List<HSU_GlobalLists__c> toUpsert = new List<HSU_GlobalLists__c>();

                for (UTSDTO uts : utsList) {
                    toUpsert.add(new HSU_GlobalLists__c(
                        HSU_Id_CEX__c = uts.codigoUts,
                        Name = uts.codigoUts,
                        HSU_Label__c = uts.descripcionUts,
                        RecordTypeId = recordTypeId
                    ));
                }

                if (!toUpsert.isEmpty()) {
                    upsert toUpsert HSU_Id_CEX__c;
                    System.debug('Actualizados ' + toUpsert.size() + ' registros de UTS');
                }
            } else {
                throw new AuraHandledException('Error al obtener UTS');
            }
        } catch (Exception ex) {
            throw new AuraHandledException('Error al obtener UTS');
        }
    }
}
