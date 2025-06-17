pipeline {
    agent any
    environment {
        SFDX_AUTH_URL = credentials('SFDX_AUTH_URL_HSU')
        SFDX_ALIAS = 'hsu'
        PACKAGE_DIR = 'force-app'
        SF_DISABLE_TELEMETRY = "true"
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'
    }
    
    // Solo ejecutar en PRs, no en pushes directos a main
    when {
        changeRequest()
    }
    
    stages {
        stage('Checkout') { 
            steps { 
                checkout scm
                script {
                    echo "🔄 Iniciando validación de PR..."
                    echo "PR: ${env.CHANGE_TITLE}"
                    echo "Autor: ${env.CHANGE_AUTHOR}"
                    echo "Branch: ${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET}"
                }
            }
        }
        
        stage('Obtener información Git') {
            steps {
                script {
                    try {
                        def gitLog = bat(script: "git log --oneline -n 2", returnStdout: true).trim()
                        echo "📋 Últimos 2 commits:"
                        echo gitLog
                        
                        def currentCommit = bat(script: "git rev-parse HEAD", returnStdout: true).trim()
                        def previousCommit = bat(script: "git rev-parse HEAD~1", returnStdout: true).trim()
                        
                        env.CURRENT_COMMIT = currentCommit.replaceAll(/[\r\n\s]/, '')
                        env.PREVIOUS_COMMIT = previousCommit.replaceAll(/[\r\n\s]/, '')
                        
                        echo "🔍 Commit actual: '${env.CURRENT_COMMIT}'"
                        echo "🔍 Commit anterior: '${env.PREVIOUS_COMMIT}'"
                        
                        if (env.CURRENT_COMMIT.length() == 40 && env.PREVIOUS_COMMIT.length() == 40) {
                            env.COMMITS_VALID = "true"
                            echo "✅ Commits válidos para generar delta"
                        } else {
                            env.COMMITS_VALID = "false"
                            echo "⚠️ Commits no válidos, se usará package.xml básico"
                        }
                        
                    } catch (Exception e) {
                        echo "❌ Error obteniendo información de Git: ${e.getMessage()}"
                        env.COMMITS_VALID = "false"
                    }
                }
            }
        }
        
        stage('Verificar SFDX') { 
            steps { 
                script {
                    echo "🔧 Verificando SFDX CLI..."
                    bat "${SF_CMD} --version"
                    echo "✅ SFDX CLI verificado"
                }
            }
        }
        
        stage('Authenticate') {
            steps {
                script {
                    echo "🔐 Autenticando con Salesforce..."
                    bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                    bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"
                    echo "✅ Autenticación exitosa"
                }
            }
        }
        
        stage('Crear package.xml') {
            steps {
                script {
                    echo "📦 Creando package.xml..."
                    bat "if not exist package mkdir package"
                    
                    if (env.COMMITS_VALID == "true") {
                        echo "🔄 Intentando crear package.xml con delta de commits..."
                        
                        try {
                            def pluginCheck = bat(script: "${SF_CMD} plugins | findstr sfdx-git-delta", returnStatus: true)
                            
                            if (pluginCheck == 0) {
                                echo "✅ Plugin sfdx-git-delta encontrado, generando delta..."
                                bat "\"${SF_CMD}\" sgd source delta --from \"${env.PREVIOUS_COMMIT}\" --to \"${env.CURRENT_COMMIT}\" --output ."
                                echo "✅ Package.xml generado con delta exitosamente"
                            } else {
                                echo "⚠️ Plugin sfdx-git-delta no encontrado, usando package básico"
                                createBasicPackage()
                            }
                            
                        } catch (Exception e) {
                            echo "❌ Error generando delta: ${e.getMessage()}"
                            echo "🔄 Creando package.xml básico como alternativa"
                            createBasicPackage()
                        }
                        
                    } else {
                        echo "📋 Commits no válidos, creando package.xml básico"
                        createBasicPackage()
                    }
                    
                    bat "if exist package\\package.xml (echo ✅ Package.xml creado exitosamente) else (echo ❌ ERROR: package.xml no encontrado)"
                    
                    if (fileExists('package\\package.xml')) {
                        echo "📄 Contenido del package.xml:"
                        bat "type package\\package.xml"
                    }
                }
            }
        }
        
        stage('Definir tests') {
            steps {
                script {
                    echo "🧪 Configurando tests..."
                    try {
                        def yamlText = readFile 'test-config.yaml'
                        def yaml = new org.yaml.snakeyaml.Yaml().load(yamlText)
                        def testList = yaml.tests.core_tests
                        env.TEST_FLAGS = testList.collect { "--tests ${it}" }.join(' ')
                        echo "✅ Tests configurados: ${testList}"
                    } catch (Exception e) {
                        echo "⚠️ Error leyendo test-config.yaml: ${e.getMessage()}"
                        echo "🔄 Usando configuración de tests por defecto"
                        env.TEST_FLAGS = "--tests HSU_SistemasUpdater_TEST --tests HSU_UTSUpdater_TEST"
                    }
                }
            }
        }
        
        stage('Validar código') {
            steps {
                script {
                    echo "🔍 Iniciando validación de código..."
                    try {
                        if (fileExists('package\\package.xml')) {
                            echo "📦 Validando con package.xml y tests específicos: ${env.TEST_FLAGS}"
                            bat "${SF_CMD} project deploy validate --manifest package\\package.xml --test-level RunSpecifiedTests ${env.TEST_FLAGS} --target-org %SFDX_ALIAS%"
                        } else {
                            echo "📁 Package.xml no encontrado, usando validación de directorios"
                            bat "${SF_CMD} project deploy validate --source-dir force-app/main/default/classes --target-org %SFDX_ALIAS% --test-level RunSpecifiedTests ${env.TEST_FLAGS}"
                        }
                        
                        echo "✅ Validación completada exitosamente"
                        
                    } catch (Exception e) {
                        echo "❌ Error en la validación: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
    }
    
    post {
        always {
            script {
                bat "if exist auth_url.txt del auth_url.txt"
                echo "🧹 Archivos temporales limpiados"
            }
        }
        success { 
            script {
                echo """
╔══════════════════════════════════════════════════════════════╗
║                    ✅ VALIDACIÓN EXITOSA                     ║
╠══════════════════════════════════════════════════════════════╣
║ PR: ${env.CHANGE_TITLE}                                      
║ Autor: ${env.CHANGE_AUTHOR}                                  
║ Branch: ${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET}         
║ Tests ejecutados: ${env.TEST_FLAGS}                          
║                                                              ║
║ 🟢 ESTADO: PR APROBADO PARA MERGE                           ║
║                                                              ║
║ Próximos pasos:                                             ║
║ 1. Revisar y aprobar el PR en GitHub                       ║
║ 2. Hacer merge a main                                      ║
║ 3. El pipeline de deploy se ejecutará automáticamente      ║
╚══════════════════════════════════════════════════════════════╝
"""
                
                // Marcar el build como exitoso con descripción
                currentBuild.description = "✅ Validación exitosa - PR listo para merge"
                currentBuild.result = 'SUCCESS'
            }
        }
        failure { 
            script {
                echo """
╔══════════════════════════════════════════════════════════════╗
║                     ❌ VALIDACIÓN FALLIDA                    ║
╠══════════════════════════════════════════════════════════════╣
║ PR: ${env.CHANGE_TITLE}                                      
║ Autor: ${env.CHANGE_AUTHOR}                                  
║ Branch: ${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET}         
║                                                              ║
║ 🔴 ESTADO: PR RECHAZADO - NO MERGEAR                        ║
║                                                              ║
║ Acciones requeridas:                                        ║
║ 1. Revisar los logs de Jenkins para detalles del error     ║
║ 2. Corregir los errores encontrados                        ║
║ 3. Hacer push de los cambios a la rama del PR              ║
║ 4. La validación se re-ejecutará automáticamente           ║
║                                                              ║
║ 🔗 Log completo: ${BUILD_URL}console                        ║
╚══════════════════════════════════════════════════════════════╝
"""
                
                // Marcar el build como fallido con descripción
                currentBuild.description = "❌ Validación fallida - Revisar errores"
                currentBuild.result = 'FAILURE'
            }
        }
        aborted {
            script {
                echo """
╔══════════════════════════════════════════════════════════════╗
║                   ⏹️ VALIDACIÓN CANCELADA                    ║
╠══════════════════════════════════════════════════════════════╣
║ PR: ${env.CHANGE_TITLE}                                      
║ Motivo: Cancelado manualmente o por timeout                 ║
║                                                              ║
║ 🔄 Para re-ejecutar: Hacer un nuevo push al PR             ║
╚══════════════════════════════════════════════════════════════╝
"""
                currentBuild.description = "⏹️ Validación cancelada"
            }
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
    echo "✅ Package.xml básico creado"
}