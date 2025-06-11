import { LightningElement, api, track, wire } from 'lwc';

import NAME_FIELD from '@salesforce/schema/HSU_GlobalLists__c.Name';
import { getRecord } from 'lightning/uiRecordApi';

export default class cHSU_GlobalListsPicker extends LightningElement {
    selectedRecordId = null;
    @track selectedRecords = [];
    currentRecordId = null;
    @api recordType = null;

    matchingInfo = {
        primaryField: { fieldPath: 'Name' },
        additionalFields: [
            { fieldPath: 'HSU_Label__c' }
        ]
    };
    
    displayInfo = {
        additionalFields: ['HSU_Label__c']
    };

    // Getter que usa el atributo público
    get recordTypeFilter() {
        return {
            criteria: [
                {
                    fieldPath: 'RecordType.DeveloperName',
                    operator: 'eq',
                    value: this.recordType
                }
            ]
        };
    }

    get pickerLabel() {
        return this.recordType === 'HSU_UTS' ? 'UTS' : 'Sistema';
    }

    // ✅ MÉTODO @API PARA OBTENER TODAS LAS PILLS COMO STRING
    @api
    getValuesAsString() {
        return this.selectedRecords.map(record => record.name).join(';');
    }

    @wire(getRecord, { recordId: '$currentRecordId', fields: [NAME_FIELD] })
    wiredRecord({ error, data }) {
        if (data) {
            const recordName = data.fields.Name.value;
            const newRecord = {
                id: this.currentRecordId,
                name: recordName,
                label: recordName
            };

            if (!this.selectedRecords.find(record => record.id === this.currentRecordId)) {
                this.selectedRecords = [...this.selectedRecords, newRecord];
            }
            
            this.currentRecordId = null;
        }
    }

    handleChange(event) {
        const recordId = event.detail.recordId;
        if (recordId) {
            this.currentRecordId = recordId;
        }
        
        const picker = this.template.querySelector('[data-id="idRecordPicker"]');
        if (picker && typeof picker.clearSelection === 'function') {
            picker.clearSelection();
        }
    }

    handleRemovePill(event) {
        const recordIdToRemove = event.target.dataset.recordId;
        this.selectedRecords = this.selectedRecords.filter(record => record.id !== recordIdToRemove);
    }

    get hasSelectedRecords() {
        return this.selectedRecords.length > 0;
    }

}