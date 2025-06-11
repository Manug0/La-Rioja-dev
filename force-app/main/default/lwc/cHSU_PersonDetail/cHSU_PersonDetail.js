import { APPLICATION_SCOPE, MessageContext, subscribe, unsubscribe } from 'lightning/messageService';
import { LightningElement, api, track, wire } from 'lwc';

import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPerson from '@salesforce/apex/HSU_PersonDetailControl.getPerson';
import { reduceErrors } from 'c/cHSU_ldsUtils';

export default class CHSU_PersonDetail extends LightningElement {
    @api recordId;
    @track data;
    @track error;
    subscription;
    token;

    @wire(MessageContext)
    messageContext;

	connectedCallback() {
		this.subscribeToTokenChannel();
	}

	subscribeToTokenChannel() {
		if (!this.subscription) {
			this.subscription = subscribe(
				this.messageContext,
				HSU_TOKEN_CHANNEL,
				(message) => this.handleTokenMessage(message),
				{ scope: APPLICATION_SCOPE }
			);
		}
	}

	handleTokenMessage(message) {
		if (message.action === 'responseToken') {
            this.token=message.token;
			this.getPersonDetail();
		}
	}
    getPersonDetail() {
        getPerson({token:this.token,recordId:this.recordId}).then(res=>{
            console.log('Respuesta completa:', JSON.stringify(res, null, 2));
            
            const persona = JSON.parse(JSON.stringify(res));
            persona.nombreCompleto = persona.nombre + ' ' + persona.apellido1 + ' ' + persona.apellido2;
            this.data = persona;
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error cargado los detalles del ciudadano',
                    message: reduceErrors(error),
                    variant: 'error'
                })
            );
            this.error = reduceErrors(error);
        });
    }
    handleReload(){
        this.data=undefined;
        this.error=undefined;
        this.getPersonDetail();
    }
}