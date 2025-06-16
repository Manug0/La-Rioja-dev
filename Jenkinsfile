pipeline {
    agent any
    environment {
        SFDX_AUTH_URL = credentials('SFDX_AUTH_URL_HSU')
        SFDX_ALIAS = 'hsu'
        PACKAGE_DIR = 'force-app'
        SF_DISABLE_TELEMETRY = "true"
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'
    }
    stages {
        stage('Checkout') { 
            steps { 
                checkout scm 
            }
        }
        
        stage('Obtener información Git') {
            steps {
                script {
                    try {
                        // Obtener commits de manera más robusta
                        def gitLog = bat(script: "git log --oneline -n 2", returnStdout: true).trim()
                        echo "Últimos 2 commits:"
                        echo gitLog
                        
                        // Obtener commits específicos
                        def currentCommit = bat(script: "git rev-parse HEAD", returnStdout: true).trim()
                        def previousCommit = bat(script: "git rev-parse HEAD~1", returnStdout: true).trim()
                        
                        // Limpiar valores
                        env.CURRENT_COMMIT = currentCommit.replaceAll(/[\r\n\s]/, '')
                        env.PREVIOUS_COMMIT = previousCommit.replaceAll(/[\r\n\s]/, '')
                        
                        echo "Commit actual: '${env.CURRENT_COMMIT}'"
                        echo "Commit anterior: '${env.PREVIOUS_COMMIT}'"
                        
                        // Validar que los commits tienen el formato correcto (40 caracteres)
                        if (env.CURRENT_COMMIT.length() == 40 && env.PREVIOUS_COMMIT.length() == 40) {
                            env.COMMITS_VALID = "true"
                            echo "Commits válidos para generar delta"
                        } else {
                            env.COMMITS_VALID = "false"
                            echo "Commits no válidos, se usará package.xml básico"
                        }
                        
                    } catch (Exception e) {
                        echo "Error obteniendo información de Git: ${e.getMessage()}"
                        env.COMMITS_VALID = "false"
                    }
                }
            }
        }
        
        stage('Verificar SFDX') { 
            steps { 
                bat "${SF_CMD} --version" 
            }
        }
        
        stage('Authenticate') {
            steps {
                bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"
            }
        }
        
        stage('Crear package.xml') {
            steps {
                script {
                    // Crear directorio package
                    bat "if not exist package mkdir package"
                    
                    if (env.COMMITS_VALID == "true") {
                        echo "Intentando crear package.xml con delta de commits..."
                        
                        try {
                            // Verificar si el plugin está instalado
                            def pluginCheck = bat(script: "${SF_CMD} plugins | findstr sfdx-git-delta", returnStatus: true)
                            
                            if (pluginCheck == 0) {
                                echo "Plugin sfdx-git-delta encontrado, generando delta..."
                                bat "\"${SF_CMD}\" sgd source delta --from \"${env.PREVIOUS_COMMIT}\" --to \"${env.CURRENT_COMMIT}\" --output ."
                                echo "Package.xml generado con delta exitosamente"
                            } else {
                                echo "Plugin sfdx-git-delta no encontrado, usando package básico"
                                createBasicPackage()
                            }
                            
                        } catch (Exception e) {
                            echo "Error generando delta: ${e.getMessage()}"
                            echo "Creando package.xml básico como alternativa"
                            createBasicPackage()
                        }
                        
                    } else {
                        echo "Commits no válidos, creando package.xml básico"
                        createBasicPackage()
                    }
                    
                    // Verificar resultado
                    bat "if exist package\\package.xml (echo Package.xml creado exitosamente) else (echo ERROR: package.xml no encontrado)"
                    
                    // Mostrar contenido del package.xml
                    if (fileExists('package\\package.xml')) {
                        bat "type package\\package.xml"
                    }
                }
            }
        }
        
        stage('Definir tests') {
            steps {
                script {
                    def testList = ["HSU_SistemasUpdater_TEST", "HSU_UTSUpdater_TEST"]
                    env.TEST_FLAGS = testList.collect { "--tests ${it}" }.join(' ')
                    echo "Tests a ejecutar: ${testList}"
                }
            }
        }
        
        stage('Validar código') {
            steps {
                script {
                    try {
                        if (fileExists('package\\package.xml')) {
                            echo "Validando con package.xml y tests específicos: ${env.TEST_FLAGS}"
                            bat "${SF_CMD} project deploy validate --manifest package\\package.xml --test-level RunSpecifiedTests ${env.TEST_FLAGS} --target-org %SFDX_ALIAS%"
                        } else {
                            echo "Package.xml no encontrado, usando validación de directorios"
                            bat "${SF_CMD} project deploy validate --source-dir force-app/main/default/classes --target-org %SFDX_ALIAS% --test-level RunSpecifiedTests --tests ${env.TEST_FLAGS}"
                        }
                        
                        echo "Validación completada exitosamente"
                        
                    } catch (Exception e) {
                        echo "Error en la validación: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
    }
    post {
        always {
            bat "if exist auth_url.txt del auth_url.txt"
        }
        success { 
            echo "Validación completada con éxito." 
            echo "Tests ejecutados: ${env.TEST_LIST}"
        }
        failure { 
            echo "Errores en la validación. Revisa el log de Jenkins." 
        }
    }
}

// Función para crear package.xml básico
def createBasicPackage() {
    def packageXml = '''<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>HSU_SistemasUpdater</members>
        <members>HSU_UTSUpdater</members>
        <members>HSU_SistemasUpdater_TEST</members>
        <members>HSU_UTSUpdater_TEST</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>HSU_GlobalLists__c</members>
        <name>CustomObject</name>
    </types>
    <version>59.0</version>
</Package>'''
    
    writeFile file: 'package/package.xml', text: packageXml
    echo "Package.xml básico creado"
}

// Fin del script