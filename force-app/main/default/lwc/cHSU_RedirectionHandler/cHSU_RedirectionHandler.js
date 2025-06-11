import { LightningElement, api, wire } from 'lwc';
import { MessageContext, subscribe, unsubscribe } from 'lightning/messageService';

import { NavigationMixin } from 'lightning/navigation';
import REDIRECTION_CHANNEL from '@salesforce/messageChannel/HSU_RedirectionChannel__c';

export default class CHSURedirectionHandler extends NavigationMixin(LightningElement) {
    @api recordId;
    subscription = null;

    @wire(MessageContext)
    messageContext;

    connectedCallback() {
        this.subscribeToMessageChannel();
    }

    disconnectedCallback() {
        this.unsubscribeToMessageChannel();
    }

    subscribeToMessageChannel() {
        if (!this.subscription) {
            this.subscription = subscribe(
                this.messageContext,
                REDIRECTION_CHANNEL,
                (message) => {
                    this.handleRedirection(message);
                }
            );
        }
    }

    unsubscribeToMessageChannel() {
        if (this.subscription) {
            unsubscribe(this.subscription);
            this.subscription = null;
        }
    }

    handleRedirection(message) {
        const { objectType, recordId, system, additionalData } = message;
        
        
        switch (system) {
            case 'CaseDetail':
                this.navigateToCaseDetail(recordId);
                break;
            case 'PersonDetail':
                this.navigateToPersonDetail(recordId);
                break;
            default:
                console.warn('Sistema de redirección no reconocido:', system);
        }
    }

    navigateToCaseDetail(caseId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: caseId,
                objectApiName: 'Case',
                actionName: 'view'
            }
        });
    }

    navigateToPersonDetail(accountId) {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: accountId,
                objectApiName: 'Account',
                actionName: 'view'
            }
        });
    }
}