/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 05-20-2025
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
 * Modifications Log
 * Ver   Date         Author                               Modification
 * 1.0   05-13-2025   ChangeMeIn@UserSettingsUnder.SFDoc   Initial Version
**/
public with sharing class HSU_DireccionDTO {
    @AuraEnabled public String idVia { get; set; }
    @AuraEnabled public String tipoDeVia { get; set; }
    @AuraEnabled public String nombreVia { get; set; }
    @AuraEnabled public String numero { get; set; }
    @AuraEnabled public String portal { get; set; }
    @AuraEnabled public String piso { get; set; }
    @AuraEnabled public String puerta { get; set; }
    @AuraEnabled public String direccion { get; set; }
    @AuraEnabled public String cp { get; set; }
    @AuraEnabled public String ccaa { get; set; }
    @AuraEnabled public String provincia { get; set; }
    @AuraEnabled public String municipio { get; set; }
    @AuraEnabled public String localidad { get; set; }

    public HSU_DireccionDTO() {
        // Constructor vacío
    }
}