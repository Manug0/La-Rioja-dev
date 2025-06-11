import { api, wire, LightningElement, track } from 'lwc';
import { reduceErrors } from 'c/cHSU_ldsUtils';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import { subscribe, publish, MessageContext, APPLICATION_SCOPE } from 'lightning/messageService';
import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';

import loadDocuments from '@salesforce/apex/HSU_listDocumentControl.loadDocuments';
import downloadDocument from '@salesforce/apex/HSU_listDocumentControl.downloadDocument';

export default class CHSU_listDocument extends LightningElement {
    @api recordId;
    @track data;
    @track error;
    subscription;
    token;
    tokenTimeoutId; // Para controlar el timeout

    @wire(MessageContext)
    messageContext;

    get titleCard() {
        return this.data ? 'Documentos (' + this.data.length + ')' : 'Documentos';
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
    handleDownload(event){
        const idDocument=event.target.dataset.name;
        downloadDocument({token:this.token,documentId:idDocument}).then(response=>{
            // Convierte el Base64 a un Blob
            const base64File = response.base64Pdf; // tu base64
            const mimeType = response.mimeType; // ejemplo para Word

            const fileBlob = base64ToBlob(base64File, mimeType);
            const fileUrl = URL.createObjectURL(fileBlob);

            // Para abrir en nueva pestaña (si el navegador lo soporta):
            window.open(fileUrl, '_blank');
        }).catch(error=>{

        }).finally(()=>{
            //para el spinner
        })
    }
    base64ToBlob(base64, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }
    handleReload(){
        this.data=undefined;
    }
}