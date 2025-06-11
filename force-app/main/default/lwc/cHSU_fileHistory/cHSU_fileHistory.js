import { APPLICATION_SCOPE, MessageContext, subscribe, unsubscribe } from 'lightning/messageService';
import { LightningElement, track, wire } from 'lwc';

import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';
import getHistorial from '@salesforce/apex/HSU_FileHistoryController.getHistorial';

const COLUMNS = [
	{
		label: 'Número Expediente',
		fieldName: 'numeroExpediente',
		type: 'text'
	},
	{
		label: 'Estado',
		fieldName: 'estadoExpediente',
		type: 'text'
	},
	{
		label: 'Fecha Modificación',
		fieldName: 'fechaModificacion',
		type: 'date',
		typeAttributes: {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		}
	},
	{
    type: 'button',
    fixedWidth: 120,
    typeAttributes: {
        label: 'VER',
        name: 'ver',
        iconName: 'utility:preview',
        variant: 'brand'
    }
  }
];

export default class CHSU_fileHistory extends LightningElement {
	@track historial = [];
	@track columns = COLUMNS;
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
		if (message && message.action === 'responseToken') {
			this.token=message.token;
			this.loadHistorial();
		}
	}

	loadHistorial() {
		this.showSpinner();
		getHistorial({token:this.token})
			.then(data => {
				this.historial = data.map(item => ({
					...item,
					linkExpediente: `/lightning/r/Case/${item.numeroExpediente}/view`
				}));
				this.error = undefined;
			})
			.catch(error => {
				this.error = error.body ? error.body.message : error;
			})
			.finally(() => {
				this.hideSpinner();
			});
	}

	showSpinner() {
		const spinner = this.template.querySelector('[data-id="idSpinner"]');
		if (spinner) {
			spinner.classList.remove('slds-hide');
		}
	}

	hideSpinner() {
		const spinner = this.template.querySelector('[data-id="idSpinner"]');
		if (spinner) {
			spinner.classList.add('slds-hide');
		}
	}

	handleReload() {
        this.loadHistorial();
    }

	disconnectedCallback() {
		if (this.subscription) {
			unsubscribe(this.subscription);
			this.subscription = null;
		}
	}
}