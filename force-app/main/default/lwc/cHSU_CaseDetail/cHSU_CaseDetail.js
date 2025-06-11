import { APPLICATION_SCOPE, MessageContext, publish, subscribe, unsubscribe } from 'lightning/messageService';
import { LightningElement, api, track, wire } from 'lwc';

import HSU_TIMELINE_CHANNEL from '@salesforce/messageChannel/HSU_TimelineChannel__c';
import HSU_TOKEN_CHANNEL from '@salesforce/messageChannel/HSU_TokenChannel__c';
import REDIRECTION_CHANNEL from '@salesforce/messageChannel/HSU_RedirectionChannel__c';
import getAccountIdByPersona from '@salesforce/apex/HSU_NavigationControl.getAccountIdByPersona';
import getExpediente from '@salesforce/apex/HSU_CaseDetail.getExpediente';

export default class CHSU_CaseDetail extends LightningElement {
    @api recordId;
    @track expediente;
    @track error;
    @track loading = false;
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
			this.getExpedienteData();
		}
	}

    getExpedienteData() {
        this.loading = true;
        getExpediente({ token: this.token, sistema: 'HSU', recordId: this.recordId })
            .then(result => {
                this.expediente = result;
                this.error = undefined;
                this.loading = false;
                this.publishToTimelineChannel(result);
            })
            .catch(error => {
                this.error = error.body ? error.body.message : error.message;
                this.loading = false;
            });
    }

    publishToTimelineChannel(expediente) {
        if (expediente && this.messageContext) {
            const data = [];

            if (expediente.fechaRegistro) {
                data.push({
                    //Titulo 
                    detailField: expediente.numeroExpediente,
                    //Campo 1
                    detailFieldLabel: 'Estado', //Desuso
                    detailFieldValue: `Expediente ${expediente.numeroExpediente} (${expediente.modelo || expediente.tipoGestion || 'Apertura'})`,
                    //Campo 2
                    fallbackTooltipField: 'Estado',
                    fallbackTooltipValue: 'expediente.estadoExpediente',
                    //Campo 3
                    positionDateValue: expediente.fechaRegistro,
                    positionDateField: 'Registro',
                    positionDateType: 'DATE',
                    //
                    tooltipId: expediente.numeroExpediente, // --> Deuso
                    //Parametros para redireccionar al click
                    drilldownId: expediente.numeroExpediente,
                    alternateDetailId: '',
                    objectId: '001',
                    objectName: 'Expediente',
                    objectLabel: 'Expediente',
                    //Parametros de estilo
                    type: 'Expediente',
                    icon: '/img/icon/t4v35/standard/record.svg',
                    iconBackground: '#107cad'
                });
            }

            if (expediente.fechaInicioSolicitud) {
                data.push({
                    //Titulo 
                    detailField: 'Petición de documentación',
                    //Campo 1
                    detailFieldLabel: 'Documento', //Desuso
                    detailFieldValue: `Solicitud: ${expediente.documentoSolicitud || expediente.documentoComunicacion || 'Documentación iniciada'}`,
                    //Campo 2
                    fallbackTooltipField: 'Documento',
                    fallbackTooltipValue: expediente.documentoSolicitud,
                    //Campo 3
                    positionDateValue: expediente.fechaInicioSolicitud,
                    positionDateField: 'Inicio Solicitud',
                    positionDateType: 'DATE',
                    //
                    tooltipId: expediente.numeroExpediente, // --> Deuso
                    //Parametros para redireccionar al click
                    drilldownId: expediente.numeroExpediente,
                    alternateDetailId: '',
                    objectId: '002',
                    objectName: 'Peticion',
                    objectLabel: 'Petición',
                    //Parametros de estilo
                    type: 'Peticion',
                    icon: '/img/icon/t4v35/standard/email.svg',
                    iconBackground: '#939393'
                });
            }

            if (expediente.fechaResolucion) {
                data.push({
                    //Titulo 
                    detailField: 'Resolución',
                    //Campo 1
                    detailFieldLabel: 'Documento', //Desuso
                    detailFieldValue: `Resolución: ${expediente.documentoResolucion || 'Expediente evaluado'} (${expediente.importe > 0 ? expediente.importe + '€' : 'Sin importe'})`,
                    //Campo 2
                    fallbackTooltipField: 'Documento',
                    fallbackTooltipValue: expediente.documentoResolucion,
                    //Campo 3
                    positionDateValue: expediente.fechaResolucion,
                    positionDateField: 'Resolución',
                    positionDateType: 'DATE',
                    //
                    tooltipId: expediente.numeroExpediente, // --> Deuso
                    //Parametros para redireccionar al click
                    drilldownId: expediente.numeroExpediente,
                    alternateDetailId: '',
                    objectId: '003',
                    objectName: 'Resolucion',
                    objectLabel: 'Resolución',
                    //Parametros de estilo
                    type: 'Resolucion',
                    icon: '/img/icon/t4v35/standard/approval.svg',
                    iconBackground: '#2e844a'
                });
            }

            if (expediente.fechaIngreso) {
                data.push({
                    //Titulo 
                    detailField: 'Ingreso',
                    //Campo 1
                    detailFieldLabel: 'Centro', //Desuso
                    detailFieldValue: `Ingreso en ${expediente.centro || 'centro asignado'} (${expediente.modalidad || 'Estándar'})`,
                    //Campo 2
                    fallbackTooltipField: 'Centro',
                    fallbackTooltipValue: expediente.centro,
                    //Campo 3
                    positionDateValue: expediente.fechaIngreso,
                    positionDateField: 'Ingreso',
                    positionDateType: 'DATE',
                    //
                    tooltipId: expediente.numeroExpediente, // --> Deuso
                    //Parametros para redireccionar al click
                    drilldownId: expediente.numeroExpediente,
                    alternateDetailId: '',
                    objectId: '004',
                    objectName: 'Ingreso',
                    objectLabel: 'Ingreso',
                    //Parametros de estilo
                    type: 'Ingreso',
                    icon: '/img/icon/t4v35/standard/lead.svg',
                    iconBackground: '#CB65FF'
                });
            }

            if (expediente.fechaFin) {
                data.push({
                    //Titulo 
                    detailField: 'Expediente cerrado',
                    //Campo 1
                    detailFieldLabel: 'Estado', //Desuso
                    detailFieldValue: `Finalización: ${expediente.estadoExpediente || 'Expediente cerrado'} (${expediente.fechaArchivo ? 'Archivado' : 'Pendiente archivo'})`,
                    //Campo 2
                    fallbackTooltipField: 'Motivo',
                    fallbackTooltipValue: expediente.estadoExpediente,
                    //Campo 3
                    positionDateValue: expediente.fechaFin,
                    positionDateField: 'Fin',
                    positionDateType: 'DATE',
                    //
                    tooltipId: expediente.numeroExpediente, // --> Deuso
                    //Parametros para redireccionar al click
                    drilldownId: expediente.numeroExpediente,
                    alternateDetailId: '',
                    objectId: '005',
                    objectName: 'Expediente',
                    objectLabel: 'Expediente',
                    //Parametros de estilo
                    type: 'Expediente',
                    icon: '/img/icon/t4v35/standard/record.svg',
                    iconBackground: '#444444'
                });
            }

            if (expediente.persona?.fechaNacimiento) {
                data.push({
                    //Titulo 
                    detailField: 'Persona',
                    //Campo 1
                    detailFieldLabel: 'Nombre', //Desuso
                    detailFieldValue: (() => {
                        if (expediente.persona) {
                            const nombreCompleto = [
                                expediente.persona.nombre,
                                expediente.persona.apellido1,
                                expediente.persona.apellido2
                            ].filter(Boolean).join(' ');
                            
                            return nombreCompleto || `DNI: ${expediente.persona.dni}`;
                        }
                        return 'Información personal';
                    })(),
                    //Campo 2
                    fallbackTooltipField: 'DNI',
                    fallbackTooltipValue: expediente.persona.dni,
                    //Campo 3
                    positionDateValue: expediente.persona.fechaNacimiento,
                    positionDateField: 'Fecha nacimiento',
                    positionDateType: 'DATE',
                    //
                    tooltipId: expediente.persona.dni, // --> Deuso
                    //Parametros para redireccionar al click
                    drilldownId: expediente.persona.dni,
                    alternateDetailId: '',
                    objectId: '006',
                    objectName: 'Persona',
                    objectLabel: 'Persona',
                    //Parametros de estilo
                    type: 'Persona',
                    icon: '/img/icon/t4v35/standard/user.svg',
                    iconBackground: '#06a59a'
                });
            }

            // Solo publica si hay eventos
            if (data.length > 0) {
                publish(this.messageContext, HSU_TIMELINE_CHANNEL, { timelineRecord: JSON.stringify(data) });
            }
        }
    }

    get nombreCompletoPersona() {
        if (this.expediente && this.expediente.persona) {
            return [
                this.expediente.persona.nombre,
                this.expediente.persona.apellido1,
                this.expediente.persona.apellido2
            ].filter(Boolean).join(' ');
        }
        return '';
    }

    handleReload() {
        this.getExpedienteData();
    }

    get isReloadDisabled() {
        return !this.error;
    }

    handlePersonClick(event) {
        event.preventDefault();
        
        if (this.expediente && this.expediente.persona) {
            this.loading = true;
            
            // Crear una copia limpia del objeto persona (sin campos extra)
            const personaClean = {
                idRus: this.expediente.persona.idRus,
                dni: this.expediente.persona.dni,
                nombre: this.expediente.persona.nombre,
                apellido1: this.expediente.persona.apellido1,
                apellido2: this.expediente.persona.apellido2,
                mail: this.expediente.persona.mail,
                telefono: this.expediente.persona.telefono,
                fechaNacimiento: this.expediente.persona.fechaNacimiento,
                sexo: this.expediente.persona.sexo
            };
            
            const personaJson = JSON.stringify(personaClean);
            console.log('JSON de persona a enviar:', personaJson);
            
            // Llamar al método Apex para obtener/crear el Account
            getAccountIdByPersona({ json_pDTO: personaJson })
                .then(accountId => {
                    console.log('AccountId obtenido:', accountId);
                    if (accountId) {
                        const message = {
                            objectType: 'Account',
                            recordId: accountId,
                            system: 'PersonDetail',
                            additionalData: {
                                idRus: this.expediente.persona.idRus,
                                dni: this.expediente.persona.dni
                            }
                        };

                        console.log('Publicando mensaje:', message);
                        publish(this.messageContext, REDIRECTION_CHANNEL, message);
                    } else {
                        this.showError('No se pudo obtener la cuenta de la persona');
                    }
                })
                .catch(error => {
                    console.error('Error completo:', error);
                    console.error('Error body:', error.body);
                    console.error('Error message:', error.body?.message);
                    this.showError('Error al acceder a los datos de la persona: ' + (error.body?.message || error.message));
                })
                .finally(() => {
                    this.loading = false;
                });
        } else {
            console.error('No hay datos de expediente o persona');
            this.showError('No hay datos de persona disponibles');
        }
    }

    showError(message) {
        console.error(message);
        this.error = message;
    }
}