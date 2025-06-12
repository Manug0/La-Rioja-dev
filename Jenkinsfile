pipeline {
    agent any

    environment {
        // Credenciales para UAT y Producción
        SFDX_AUTH_URL_UAT = credentials('SFDX_AUTH_URL_UAT')
        SFDX_AUTH_URL_PROD = credentials('SFDX_AUTH_URL_PROD')
        SFDX_ALIAS_UAT = 'uat'
        SFDX_ALIAS_PROD = 'prod'
        PACKAGE_DIR = 'force-app'
        SF_DISABLE_TELEMETRY = "true"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verificar SFDX y dependencias') {
            steps {
                sh 'sfdx --version'
                sh 'node --version'
            }
        }

        stage('Authenticate UAT') {
            steps {
                sh 'echo $SFDX_AUTH_URL_UAT > ./auth_url_uat.txt'
                sh 'sfdx auth:sfdxurl:store -f ./auth_url_uat.txt -a $SFDX_ALIAS_UAT'
            }
        }

        stage('Validar en UAT') {
            steps {
                sh 'sfdx force:source:deploy -p $PACKAGE_DIR -u $SFDX_ALIAS_UAT --checkonly --testlevel RunLocalTests'
            }
        }

        stage('Authenticate Producción') {
            steps {
                sh 'echo $SFDX_AUTH_URL_PROD > ./auth_url_prod.txt'
                sh 'sfdx auth:sfdxurl:store -f ./auth_url_prod.txt -a $SFDX_ALIAS_PROD'
            }
        }

        stage('Desplegar a Producción') {
            steps {
                sh 'sfdx force:source:deploy -p $PACKAGE_DIR -u $SFDX_ALIAS_PROD --wait 30 --testlevel RunLocalTests'
            }
        }
    }

    post {
        success {
            echo "Validación y despliegue completados con éxito."
        }
        failure {
            mail to: 'tu-email@dominio.com',
                 subject: "Fallo en validación o despliegue",
                 body: "El pipeline ha fallado. Revisa el log de Jenkins."
        }
    }
}