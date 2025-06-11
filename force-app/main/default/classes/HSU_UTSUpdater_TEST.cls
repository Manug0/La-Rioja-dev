@isTest
private class HSU_UTSUpdater_TEST {
    // Mock para respuesta exitosa (1 registro)
    class MockSuccess implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('[{"codigoUts":"UTS1","descripcionUts":"UTS 1"}]');
            return res;
        }
    }
    // Mock para respuesta de error
    class MockError implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(400);
            res.setBody('Error');
            return res;
        }
    }
    // Mock para respuesta mixta (algunos ya existen, otros no)
    class MockUpsert implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody(
                '[{"codigoUts":"UTS1","descripcionUts":"UTS 1"},' +
                '{"codigoUts":"UTS2","descripcionUts":"UTS 2"},' +
                '{"codigoUts":"UTS3","descripcionUts":"UTS 3"},' +
                '{"codigoUts":"UTS4","descripcionUts":"UTS 4"},' +
                '{"codigoUts":"UTS5","descripcionUts":"UTS 5"}]'
            );
            return res;
        }
    }

    @isTest
    static void testUpdateUTSSuccess() {
        Test.setMock(HttpCalloutMock.class, new MockSuccess());
        Test.startTest();
        HSU_UTSUpdater.updateUTS();
        Test.stopTest();

        List<HSU_GlobalLists__c> utsList = [SELECT HSU_Id_CEX__c, Name, HSU_Label__c FROM HSU_GlobalLists__c];
        System.assertEquals(1, utsList.size());
        System.assertEquals('UTS1', utsList[0].HSU_Id_CEX__c);
        System.assertEquals('UTS1', utsList[0].Name);
        System.assertEquals('UTS 1', utsList[0].HSU_Label__c);
    }

    @isTest
    static void testUpdateUTSError() {
        Test.setMock(HttpCalloutMock.class, new MockError());
        Test.startTest();
        try {
            HSU_UTSUpdater.updateUTS();
            System.assert(false, 'Se esperaba excepción');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Error al obtener UTS'), 'Mensaje de error esperado');
        }
        Test.stopTest();
    }

    @isTest
    static void testUpdateUTSUpsert() {
        // Pre-insertar 3 registros que ya existen
        List<HSU_GlobalLists__c> existentes = new List<HSU_GlobalLists__c>{
            new HSU_GlobalLists__c(HSU_Id_CEX__c='UTS1', Name='UTS1', HSU_Label__c='UTS 1'),
            new HSU_GlobalLists__c(HSU_Id_CEX__c='UTS2', Name='UTS2', HSU_Label__c='UTS 2'),
            new HSU_GlobalLists__c(HSU_Id_CEX__c='UTS3', Name='UTS3', HSU_Label__c='UTS 3')
        };
        insert existentes;

        Test.setMock(HttpCalloutMock.class, new MockUpsert());
        Test.startTest();
        HSU_UTSUpdater.updateUTS();
        Test.stopTest();

        // Deben existir 5 registros, los 3 originales y 2 nuevos
        List<HSU_GlobalLists__c> utsList = [SELECT HSU_Id_CEX__c, Name, HSU_Label__c FROM HSU_GlobalLists__c];
        System.assertEquals(5, utsList.size());

        // Comprobar que existen todos los códigos esperados
        Set<String> codigos = new Set<String>();
        for (HSU_GlobalLists__c u : utsList) codigos.add(u.HSU_Id_CEX__c);
        System.assert(codigos.contains('UTS1'));
        System.assert(codigos.contains('UTS2'));
        System.assert(codigos.contains('UTS3'));
        System.assert(codigos.contains('UTS4'));
        System.assert(codigos.contains('UTS5'));
    }
}