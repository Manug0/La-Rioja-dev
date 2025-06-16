@isTest
private class HSU_SistemasUpdater_TEST {
    // Mock para respuesta exitosa (1 registro)
    class MockSuccess implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('[{"codigoSistema":"SIS1","descripcionSistema":"Sistema 1"}]');
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
                '[{"codigoSistema":"SIS1","descripcionSistema":"Sistema 1"},' +
                '{"codigoSistema":"SIS2","descripcionSistema":"Sistema 2"},' +
                '{"codigoSistema":"SIS3","descripcionSistema":"Sistema 3"},' +
                '{"codigoSistema":"SIS4","descripcionSistema":"Sistema 4"},' +
                '{"codigoSistema":"SIS5","descripcionSistema":"Sistema 5"}]'
            );
            return res;
        }
    }

    @isTest
    static void testUpdateSistemasSuccess() {
        Test.setMock(HttpCalloutMock.class, new MockSuccess());
        Test.startTest();
        HSU_SistemasUpdater.updateSistemas();
        Test.stopTest();

        List<HSU_GlobalLists__c> sisList = [SELECT HSU_Id_CEX__c, Name, HSU_Label__c FROM HSU_GlobalLists__c];
        System.assertEquals(1, sisList.size());
        System.assertEquals('SIS1', sisList[0].HSU_Id_CEX__c);
        System.assertEquals('SIS1', sisList[0].Name);
        System.assertEquals('Sistema 1', sisList[0].HSU_Label__c);
    }

    @isTest
    static void testUpdateSistemasError() {
        Test.setMock(HttpCalloutMock.class, new MockError());
        Test.startTest();
        try {
            HSU_SistemasUpdater.updateSistemas();
            System.assert(false, 'Se esperaba excepción');
        } catch (Exception e) {
            System.debug('Mensaje de excepción: ' + e.getMessage());
            System.debug('Tipo de excepción: ' + e.getTypeName());
            // Acepta cualquier excepción que indique error
            System.assert(
                e.getMessage() != null && 
                (e.getMessage().contains('Error al obtener Sistemas') || 
                e.getMessage().contains('Script-thrown exception') ||
                e.getMessage().contains('Error')),
                'Se esperaba mensaje de error, recibido: ' + e.getMessage()
            );
        }
        Test.stopTest();
    }

    @isTest
    static void testUpdateSistemasUpsert() {
        // Pre-insertar 3 registros que ya existen
        List<HSU_GlobalLists__c> existentes = new List<HSU_GlobalLists__c>{
            new HSU_GlobalLists__c(HSU_Id_CEX__c='SIS1', Name='SIS1', HSU_Label__c='Sistema 1'),
            new HSU_GlobalLists__c(HSU_Id_CEX__c='SIS2', Name='SIS2', HSU_Label__c='Sistema 2'),
            new HSU_GlobalLists__c(HSU_Id_CEX__c='SIS3', Name='SIS3', HSU_Label__c='Sistema 3')
        };
        insert existentes;

        Test.setMock(HttpCalloutMock.class, new MockUpsert());
        Test.startTest();
        HSU_SistemasUpdater.updateSistemas();
        Test.stopTest();

        // Deben existir 5 registros, los 3 originales y 2 nuevos
        List<HSU_GlobalLists__c> sisList = [SELECT HSU_Id_CEX__c, Name, HSU_Label__c FROM HSU_GlobalLists__c];
        System.assertEquals(5, sisList.size());

        // Comprobar que existen todos los códigos esperados
        Set<String> codigos = new Set<String>();
        for (HSU_GlobalLists__c s : sisList) codigos.add(s.HSU_Id_CEX__c);
        System.assert(codigos.contains('SIS1'));
        System.assert(codigos.contains('SIS2'));
        System.assert(codigos.contains('SIS3'));
        System.assert(codigos.contains('SIS4'));
        System.assert(codigos.contains('SIS5'));
    }
}