import { APPLICATION_SCOPE, MessageContext, publish, subscribe } from 'lightning/messageService';
import { LightningElement, api, track, wire } from 'lwc';

import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';
import SHOW_LESS from '@salesforce/label/c.HSU_ShowLess';
import SHOW_MORE from '@salesforce/label/c.HSU_ShowMore';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import loadDocuments from '@salesforce/apex/HSU_listRectificationControl.loadRectifications';
import { reduceErrors } from 'c/cHSU_ldsUtils';

const LIMITE_VISIBLES=5;
export default class CHSU_listRectification extends LightningElement {
    @api recordId;
    @track data;
    @track dataFilter;
    @track error;
    subscription;
    token;
    tokenTimeoutId; // Para controlar el timeout
    label = {
        SHOW_LESS,
        SHOW_MORE,
    };
    @wire(MessageContext)
    messageContext;

    get titleCard(){
        let title='Subsanaciones';
        if (this.data && this.dataFilter){
            if(this.data.length>this.dataFilter.length){
                title+=' ('+this.dataFilter.length+'+)';
            }else{
                title+=' ('+this.data.length+')';
            }
        }
        return title;
    }
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
        this.startTokenTimeout();
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
            this.token = message.token;
            this.clearTokenTimeout();
            this.loadDocument();
        }
    }

    startTokenTimeout() {
        // Si en 2 segundos no hay token, solicita uno
        this.tokenTimeoutId = setTimeout(() => {
            if (!this.token) {
                this.requestToken();
            }
        }, 2000);
    }

    clearTokenTimeout() {
        if (this.tokenTimeoutId) {
            clearTimeout(this.tokenTimeoutId);
            this.tokenTimeoutId = null;
        }
    }

    requestToken() {
        // Publica un mensaje solicitando el token
        const requestMessage = {
            action: 'requestToken'
        };
        publish(this.messageContext, HSU_TOKEN_CHANNEL, requestMessage);
    }

    loadDocument() {
        const body = {};
        loadDocuments({ token: this.token, recordId: this.recordId, body: body }).then(res => {
            this.data = JSON.parse(JSON.stringify(res));
            if (this.data.length > LIMITE_VISIBLES) {
                this.dataFilter = JSON.parse(JSON.stringify(this.data.slice(0, LIMITE_VISIBLES)));
            } else {
                this.dataFilter = JSON.parse(JSON.stringify(this.data));
            }
        }).catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error cargando los documentos',
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
        this.loadDocument();
    }
    handleShowMore(){
        if (this.dataFilter.length > LIMITE_VISIBLES) {
            this.dataFilter = JSON.parse(JSON.stringify(this.data.slice(0, LIMITE_VISIBLES)));
        } else {
            this.dataFilter = JSON.parse(JSON.stringify(this.data));
        }
    }
}