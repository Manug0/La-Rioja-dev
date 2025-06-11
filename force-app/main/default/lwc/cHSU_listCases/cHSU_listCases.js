import { LightningElement,wire,track,api } from 'lwc';
import { reduceErrors } from 'c/cHSU_ldsUtils';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

import { subscribe, MessageContext, APPLICATION_SCOPE, unsubscribe } from 'lightning/messageService';
import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';

import getCases from '@salesforce/apex/HSU_listCasesControl.getCases';
import navigateCase from '@salesforce/apex/HSU_listCasesControl.navigateCase';

export default class CHSU_listCases extends NavigationMixin(LightningElement) {
    @api recordId;
    @track fullData;
    @track data;
    @track error;
    subscription;
    token;
    sortedByLabel='expediente';
    
    get titleCard(){
        let title='Expedientes';
        if (this.data){
            title+='('+this.data.length+')';
        }
        return title;
    }

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
			this.getCases();
		}
	}

    getCases() {
        const body={};
        getCases({token:this.token,recordId:this.recordId, body:body}).then(res=>{
            this.fullData=JSON.parse(JSON.stringify(res));
            this.data=JSON.parse(JSON.stringify(res.expedientes));
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error cargado los expedientes del ciudadano',
                    message: reduceErrors(error),
                    variant: 'error'
                })
            );
            this.error=reduceErrors(error);
        });
    }
    handleReload(){
        this.data=undefined;
        this.error=undefined;
        this.getCases();
    }
    handleClickCase(event){
        const numeroExpediente = event.target.dataset.name;
        //Con este número de expediente, vamos a FULLData a recoger los datos del expediente, mandarlo como parámetro en el apex y gestionarlo allí.
        const expediente=this.fullData.expedientes.find(expediente => expediente.numeroExpediente===numeroExpediente);
        navigateCase({expediente:expediente, recordId:this.recordId}).then(res=>{
            // 3. Navegación al registro creado/actualizado
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: res,
                    objectApiName: 'Case',
                    actionName: 'view'
                }
            });
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error al navegar al expediente',
                    message: reduceErrors(error),
                    variant: 'error'
                })
            );
            this.error=reduceErrors(error);
        });
    }
}