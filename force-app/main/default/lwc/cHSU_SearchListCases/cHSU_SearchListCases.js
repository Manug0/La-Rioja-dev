import { LightningElement, track, wire } from 'lwc';
import { APPLICATION_SCOPE, MessageContext, subscribe, unsubscribe,publish } from 'lightning/messageService';

import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getCases from '@salesforce/apex/HSU_searchListCasesControl.getCases';
import { reduceErrors } from 'c/cHSU_ldsUtils';
import upsertCase from '@salesforce/apex/HSU_searchListCasesControl.upsertCase';

import SHOW_LESS from '@salesforce/label/c.HSU_ShowLess';
import SHOW_MORE from '@salesforce/label/c.HSU_ShowMore';
const LIMITE_VISIBLES=10;
export default class CHSU_listPersonAccount extends NavigationMixin(LightningElement) {
	columns = [
		{ label: 'Sistema', fieldName: 'sistema' },
		{ label: 'Nº Expediente', fieldName: 'numeroExpediente' },
		{ label: 'Nombre ciudadano', fieldName: 'nombreCompleto' },
		{ label: 'Estado', fieldName: 'estado' },
		{
			type: 'button',
			typeAttributes: {
				label: 'VER',
				name: 'ver',
				title: 'Ver',
				variant: 'brand',
				iconName: 'utility:preview'
			}
		}
	];

	@track data;
    @track dataFilter;
	@track error;
	subscription;
	token;
    label = {
        SHOW_LESS,
        SHOW_MORE,
    };
    spinner=true;

	@wire(MessageContext)
	messageContext;
	get showMoreVisible(){
		return this.data && this.data.length>LIMITE_VISIBLES;
	}
	get labelShowMore(){
		let label='';
		if (this.dataFilter.length > LIMITE_VISIBLES) {
			label=this.label.SHOW_LESS;
		} else {
			label=this.label.SHOW_MORE;
		}
		return label;
	}
	isFilter=true;
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
			this.hideSpinner();
		}
	}

	loadCases(body) {
		this.error = undefined;
		this.showSpinner();
		getCases({token:this.token,body:body})
			.then(result => {
				this.data = result.map(item => ({
					...item,
					nombreCompleto:'nombre ciudadano'
				}));
				if (this.data.length > LIMITE_VISIBLES) {
					this.dataFilter = JSON.parse(JSON.stringify(this.data.slice(0, LIMITE_VISIBLES)));
				} else {
					this.dataFilter = JSON.parse(JSON.stringify(this.data));
				}
			})
			.catch(error => {
				this.data=undefined;
				this.dataFilter=undefined;
				this.error = reduceErrors(error);
				this.dispatchEvent(new ShowToastEvent({
					title: 'Error buscando expediente',
					message: reduceErrors(error),
					variant: 'error'
				}));
			})
			.finally(() => {
				this.hideSpinner();
			});
	}

	disconnectedCallback() {
		if (this.subscription) {
			unsubscribe(this.subscription);
			this.subscription = null;
		}
	}

	dispatchError(title, error) {
		
	}
	
	handleRowAction(event) {
		const row = event.detail.row;
		const expedienteJson = JSON.stringify(row);
		this.showSpinner();
		this.handleUpsertCase(expedienteJson);
	}
	handleUpsertCase(expediente){
		upsertCase({token:this.token,jsonExpediente:expediente })
			.then(result => {
				// 3. Navegación al registro creado/actualizado
				this[NavigationMixin.Navigate]({
					type: 'standard__recordPage',
					attributes: {
						recordId: result,
						objectApiName: 'Case',
						actionName: 'view'
					}
				});
			})
			.catch(error => {
				this.dispatchEvent(new ShowToastEvent({
					title: 'Error al redirigir al Expediente',
					message: reduceErrors(error),
					variant: 'error'
				}));
			}).finally(()=>{
				this.hideSpinner();
			});
	}
	handleSearch() {
		const inputs = this.template.querySelectorAll('lightning-input');
		let values = {};
		let validityCompleted=true;
		inputs.forEach(input => {
			if(input.name) values[input.name] = input.value;
			if(input.required && !input.reportValidity()) validityCompleted=false;
		});
		if(validityCompleted) this.loadCases(values);
	}
	// Para mostrar el spinner (quitar slds-hide)
	showSpinner() {
        this.spinner=true;
	}
	// Para ocultar el spinner (añadir slds-hide)
	hideSpinner() {
		this.spinner=false;
	}
    handleReload(){
        this.error=undefined;
        this.token=undefined;
        this.showSpinner();
        const requestMessage = {
            action: 'requestToken'
        };
        publish(this.messageContext, HSU_TOKEN_CHANNEL, requestMessage);
    }
    handleShowMore(){
        if (this.dataFilter.length > LIMITE_VISIBLES) {
            this.dataFilter = JSON.parse(JSON.stringify(this.data.slice(0, LIMITE_VISIBLES)));
        } else {
            this.dataFilter = JSON.parse(JSON.stringify(this.data));
        }
    }
	handleFilter(){
		const inputs = this.template.querySelectorAll('lightning-input');
		inputs.forEach(input => {
			input.classList.toggle('slds-hide');
		});
		this.isFilter=!this.isFilter;
	}
}