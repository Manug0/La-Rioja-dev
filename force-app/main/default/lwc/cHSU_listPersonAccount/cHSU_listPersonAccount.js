import { APPLICATION_SCOPE, MessageContext, subscribe, unsubscribe } from 'lightning/messageService';
import { LightningElement, track, wire } from 'lwc';

import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPersonas from '@salesforce/apex/HSU_listPersonAccount.getPersonas';
import { reduceErrors } from 'c/cHSU_ldsUtils';
import upsertAccountWithPersona from '@salesforce/apex/HSU_listPersonAccount.upsertAccountWithPerson';

import SHOW_LESS from '@salesforce/label/c.HSU_ShowLess';
import SHOW_MORE from '@salesforce/label/c.HSU_ShowMore';
const LIMITE_VISIBLES=10;
export default class CHSU_listPersonAccount extends NavigationMixin(LightningElement) {
	columns = [
		{ label: 'Nombre Completo', fieldName: 'nombreCompleto' },
		{ label: 'DNI', fieldName: 'dni' },
		{ label: 'Sexo', fieldName: 'sexo' },
		{ label: 'Nacionalidad', fieldName: 'nacionalidad' },
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
	isFilter=true;
    label = {
        SHOW_LESS,
        SHOW_MORE,
    };
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

	loadPersonas(body) {
		this.error = undefined;
		this.showSpinner();
		getPersonas({token:this.token,body:body})
			.then(result => {
				this.data = result.map(item => ({
					...item,
					nombreCompleto: `${item.nombre} ${item.apellido1} ${item.apellido2 || ''}`.trim()
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
					title: 'Error al buscar al ciudadano',
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
	
	handleRowAction(event) {
		const row = event.detail.row;
		delete row.nombreCompleto;
		const personaJson = JSON.stringify(row);
		this.showSpinner();
		this.handleUpsertPersona(personaJson);
	}
	handleUpsertPersona(persona){
		upsertAccountWithPersona({ json_pDTO:persona })
			.then(result => {
				// 3. Navegación al registro creado/actualizado
				this[NavigationMixin.Navigate]({
					type: 'standard__recordPage',
					attributes: {
						recordId: result,
						objectApiName: 'Account',
						actionName: 'view'
					}
				});
			})
			.catch(error => {
				this.dispatchEvent(new ShowToastEvent({
					title: 'Error al redirigir a la persona',
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
		if(validityCompleted) this.loadPersonas(values);
	}
	// Para mostrar el spinner (quitar slds-hide)
	showSpinner() {
	const spinner = this.template.querySelector('[data-id="idSpinner"]');
		if (spinner) {
			spinner.classList.remove('slds-hide');
		}
	}

	// Para ocultar el spinner (añadir slds-hide)
	hideSpinner() {
		const spinner = this.template.querySelector('[data-id="idSpinner"]');
		if (spinner) {
			spinner.classList.add('slds-hide');
		}
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