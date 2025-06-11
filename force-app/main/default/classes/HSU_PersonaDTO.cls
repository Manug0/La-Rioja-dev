/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 05-09-2025
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc 
 * Modifications Log
 * Ver   Date         Author                               Modification
 * 1.0   05-09-2025   ChangeMeIn@UserSettingsUnder.SFDoc   Initial Version
**/
public with sharing class HSU_PersonaDTO {
    @AuraEnabled public String idRus;
    @AuraEnabled public String dni;
    @AuraEnabled public String nombre;
    @AuraEnabled public String apellido1;
    @AuraEnabled public String apellido2;
    @AuraEnabled public String fechaNacimiento;
    @AuraEnabled public String sexo;
    @AuraEnabled public String tarjetaSanitaria;
    @AuraEnabled public String paisNacimiento;
    @AuraEnabled public String nacionalidad;
    @AuraEnabled public String telefono;
    @AuraEnabled public String mail;
    @AuraEnabled public String fechaFallecimiento;
    @AuraEnabled public String gradoDeDiscapacidad;
    @AuraEnabled public String gradoDeDependencia;
    @AuraEnabled public String unidadDetrabajoSocialDeReferencia;
    @AuraEnabled public String unidadDeTrabajoSocial;
    @AuraEnabled public HSU_DireccionDTO direccion;
}