/**
 * @description       : 
 * @author            : ChangeMeIn@UserSettingsUnder.SFDoc
 * @group             : 
 * @last modified on  : 05-19-2025
 * @last modified by  : ChangeMeIn@UserSettingsUnder.SFDoc
 * Modifications Log
 * Ver   Date         Author                               Modification
 * 1.0   05-13-2025   ChangeMeIn@UserSettingsUnder.SFDoc   Initial Version
**/
public with sharing class HSU_getSessionTokenControl {
	// Constante configurable para expiración (en horas)
	private static final Integer TOKEN_EXPIRATION_HOURS = 1;
	
	// Inner class para estructura del token en caché
	public class HSUSessionToken {
		public String token;
		public Datetime tokenDate;
	}
	@AuraEnabled
	public static String getSessionToken() {
		HSUSessionToken cachedToken = (HSUSessionToken)Cache.Session.get('HSUSessionToken');
		Datetime now = Datetime.now();
		
		if(needsNewToken(cachedToken, now)) {
			return generateAndStoreNewToken(now);
		}
		return cachedToken.token;
	}

	private static Boolean needsNewToken(HSUSessionToken token, Datetime checkTime) {
		return token == null || 
			   token.token == null || 
			   token.tokenDate == null || 
			   checkTime.getTime() - token.tokenDate.getTime() > (TOKEN_EXPIRATION_HOURS * 3600000);
	}

	private static String generateAndStoreNewToken(Datetime generationTime) {
		HSUSessionToken newToken = new HSUSessionToken();
		newToken.token = generateNewToken();
		newToken.tokenDate = generationTime;
		Cache.Session.put('HSUSessionToken', newToken);
		return newToken.token;
	}

	private static String generateNewToken() {
		return 'UlVTMDAyLUFETUlO';
		// return EncodingUtil.base64Encode(
		// 	Crypto.generateAesKey(128)
		// ).left(40); // Longitud de 40 caracteres
	}
}