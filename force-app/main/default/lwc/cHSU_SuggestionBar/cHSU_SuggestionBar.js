import { EnclosingUtilityId, minimize } from 'lightning/platformUtilityBarApi';
import { LightningElement, wire } from 'lwc';

import INCIDENT_OBJECT from '@salesforce/schema/Incident';
import { NavigationMixin } from 'lightning/navigation';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class SugerenciasBar extends NavigationMixin(LightningElement) {
    @wire(EnclosingUtilityId) utilityId;
    showSuccessAlert = false;
    showErrorAlert = false;
    sugestionId;
    sugestionUrl;
    errorMessage = '';

    @wire(getObjectInfo, { objectApiName: INCIDENT_OBJECT })
    objectInfo;

    get sugerenciaRecordTypeId() {
        if (this.objectInfo.data) {
            const recordTypeInfos = this.objectInfo.data.recordTypeInfos;
            // Busca el RecordTypeId por developerName
            const recordTypeId = Object.keys(recordTypeInfos).find(
                id => recordTypeInfos[id].name === 'Sugerencia'
            );
            return recordTypeId;
        }
        return null;
    }

    handleSuccess(event) {
        this.showErrorAlert = false;
        this.errorMessage = '';
        
        this.sugestionId = event.detail.id;
        this.sugestionUrl = `/lightning/r/Incident/${this.sugestionId}/view`;
        this.showSuccessAlert = true;
        
        const inputFields = this.template.querySelectorAll('lightning-input-field');
        if (inputFields) {
            inputFields.forEach(field => {
                field.reset();
            });
        }
        
        setTimeout(() => {
            this.showSuccessAlert = false;
        }, 7000);
    }

    handleError(event) {
        this.showSuccessAlert = false;
        
        console.error('Error al enviar la sugerencia:', event.detail);
        
        let errorMsg = 'Por favor, verifica los datos e inténtalo nuevamente.';
        
        if (event.detail && event.detail.detail) {
            errorMsg = event.detail.detail;
        } else if (event.detail && event.detail.message) {
            errorMsg = event.detail.message;
        }
        
        this.errorMessage = errorMsg;
        this.showErrorAlert = true;
        
        setTimeout(() => {
            this.showErrorAlert = false;
        }, 10000);
    }
    
    closeSuccessAlert() {
        this.showSuccessAlert = false;
    }
    
    closeErrorAlert() {
        this.showErrorAlert = false;
        this.errorMessage = '';
    }
    
    navigateToRecord(event) {
        event.preventDefault();
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.sugestionId,
                objectApiName: 'Incident',
                actionName: 'view'
            }
        });


        // Minimiza la caja de sugerencias al navegar a la sugerencia
        try {
            if (!this.utilityId) {
                return;
            }
        const isMinimized = minimize(this.utilityId);
        console.log(`Minimize utility ${isMinimized ? 'successfully' : 'failed'}`);
        }
        catch (error) {
            console.error('Error al minimizar la barra de utilidades:', error);
        }
    
    }
}