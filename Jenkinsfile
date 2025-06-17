pipeline {
    agent any
    environment {
        SFDX_AUTH_URL = credentials('SFDX_AUTH_URL_HSU')
        SFDX_ALIAS = 'hsu'
        PACKAGE_DIR = 'force-app'
        SF_DISABLE_TELEMETRY = "true"
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'
        
        // Variables para GitHub Status API
        GITHUB_TOKEN = credentials('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')
        REPO_OWNER = 'Manug0'
        REPO_NAME = 'La-Rioja-dev'
    }

    stages {
        stage('Checkout') { 
            steps { 
                checkout scm
                updateGitHubStatus('pending', '🔄 Validación en curso - PR en revisión')
            }
        }
        
        stage('Obtener información Git') {
            when {
                changeRequest()
            }
            steps {
                script {
                    try {
                        def gitLog = bat(script: "git log --oneline -n 2", returnStdout: true).trim()
                        echo "Últimos 2 commits:"
                        echo gitLog
                        
                        def currentCommit = bat(script: "git rev-parse HEAD", returnStdout: true).trim()
                        def previousCommit = bat(script: "git rev-parse HEAD~1", returnStdout: true).trim()
                        
                        env.CURRENT_COMMIT = currentCommit.replaceAll(/[\r\n\s]/, '')
                        env.PREVIOUS_COMMIT = previousCommit.replaceAll(/[\r\n\s]/, '')
                        
                        echo "Commit actual: '${env.CURRENT_COMMIT}'"
                        echo "Commit anterior: '${env.PREVIOUS_COMMIT}'"
                        
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
            when {
                changeRequest()
            }
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
                    bat "if not exist package mkdir package"
                    
                    if (env.COMMITS_VALID == "true") {
                        echo "Intentando crear package.xml con delta de commits..."
                        
                        try {
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
                    
                    bat "if exist package\\package.xml (echo Package.xml creado exitosamente) else (echo ERROR: package.xml no encontrado)"
                    
                    if (fileExists('package\\package.xml')) {
                        bat "type package\\package.xml"
                    }
                }
            }
        }
        
        stage('Definir tests') {
            steps {
                script {
                    def yamlText = readFile 'test-config.yaml'
                    def yaml = new org.yaml.snakeyaml.Yaml().load(yamlText)
                    def testList = yaml.tests.core_tests
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
                            bat "${SF_CMD} project deploy validate --source-dir force-app/main/default/classes --target-org %SFDX_ALIAS% --test-level RunSpecifiedTests ${env.TEST_FLAGS}"
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
            script {
                echo "✅ Validación completada con éxito."
                echo "Tests ejecutados: ${env.TEST_FLAGS}"
                
                // Actualizar status en GitHub como exitoso
                updateGitHubStatus('success', '✅ Validación exitosa - PR listo para merge')
                
                // Comentario en el PR
                addPRComment("""
## ✅ Validación Exitosa
                
**Estado:** PR aprobado para merge
**Tests ejecutados:** Todos los tests pasaron correctamente
**Package.xml:** Generado exitosamente
                
🟢 **Acción requerida:** Este PR puede ser mergeado de forma segura.
                
---
*Validación completada en: ${new Date()}*
""")
            }
        }
        failure { 
            script {
                echo "❌ Errores en la validación."
                
                // Actualizar status en GitHub como fallido
                updateGitHubStatus('failure', '❌ Validación fallida - NO mergear')
                
                // Comentario en el PR
                addPRComment("""
## ❌ Validación Fallida
                
**Estado:** PR rechazado - NO MERGEAR
**Error:** La validación ha fallado
                
🔴 **Acción requerida:** 
1. Revisa los logs de Jenkins para más detalles
2. Corrige los errores encontrados
3. Haz push de los cambios para re-ejecutar la validación
                
---
*Validación fallida en: ${new Date()}*
**Log de Jenkins:** [Ver detalles](${BUILD_URL}console)
""")
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
    echo "Package.xml básico creado"
}

// Función para actualizar el status en GitHub
def updateGitHubStatus(String state, String description) {
    try {
        bat """
        curl -X POST ^
        -H "Authorization: token %GITHUB_TOKEN%" ^
        -H "Accept: application/vnd.github.v3+json" ^
        "https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/statuses/${env.GIT_COMMIT}" ^
        -d "{\\"state\\": \\"${state}\\", \\"description\\": \\"${description}\\", \\"context\\": \\"Jenkins/validation\\"}"
        """
    } catch (Exception e) {
        echo "Error actualizando GitHub status: ${e.getMessage()}"
    }
}

// Función para agregar comentario al PR
def addPRComment(String comment) {
    try {
        // Obtener número del PR
        def prNumber = env.CHANGE_ID
        
        bat """
        curl -X POST ^
        -H "Authorization: token %GITHUB_TOKEN%" ^
        -H "Accept: application/vnd.github.v3+json" ^
        "https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/issues/${prNumber}/comments" ^
        -d "{\\"body\\": \\"${comment.replace('"', '\\"').replace('\n', '\\n')}\\"}"
        """
    } catch (Exception e) {
        echo "Error agregando comentario al PR: ${e.getMessage()}"
    }
}