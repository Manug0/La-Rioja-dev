@isTest
private class HSU_SimpleCalculator_TEST {
    
    @isTest
    static void testAdd() {
        Test.startTest();
        Integer resultado = HSU_SimpleCalculator.add(5, 3);
        Test.stopTest();
        
        System.assertEquals(8, resultado, 'La suma debe ser 8');
    }
    
    @isTest
    static void testSubtract() {
        Test.startTest();
        Integer resultado = HSU_SimpleCalculator.subtract(10, 4);
        Test.stopTest();
        
        System.assertEquals(6, resultado, 'La resta debe ser 6');
    }
    
    @isTest
    static void testMultiply() {
        Test.startTest();
        Integer resultado = HSU_SimpleCalculator.multiply(3, 4);
        Test.stopTest();
        
        System.assertEquals(12, resultado, 'La multiplicación debe ser 12');
    }
    
    @isTest
    static void testWelcomeMessage() {
        Test.startTest();
        String mensaje = HSU_SimpleCalculator.getWelcomeMessage();
        Test.stopTest();
        
        System.assertEquals('Bienvenido a la calculadora simple', mensaje, 'El mensaje debe coincidir');
        System.assert(mensaje.contains('calculadora'), 'El mensaje debe contener la palabra calculadora');
    }
    
    @isTest
    static void testMultipleOperations() {
        Test.startTest();
        Integer suma = HSU_SimpleCalculator.add(1, 1);
        Integer resta = HSU_SimpleCalculator.subtract(suma, 1);
        Integer multiplicacion = HSU_SimpleCalculator.multiply(resta, 5);
        Test.stopTest();
        
        System.assertEquals(2, suma);
        System.assertEquals(1, resta);
        System.assertEquals(5, multiplicacion);
    }
}