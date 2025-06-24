pipeline {
    agent any
    environment {
        SFDX_AUTH_URL = credentials('SFDX_AUTH_URL_HSU')
        GITHUB_HSU_TAG = 'HSU_START'
        SFDX_ALIAS = 'hsu'
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'
        GITHUB_TOKEN = credentials('github-pat')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Verificar si el repo está shallow antes de hacer unshallow
                    def isShallow = bat(script: "git rev-parse --is-shallow-repository", returnStdout: true).trim()
                    if (isShallow == 'true') {
                        echo "📥 Repositorio shallow detectado, obteniendo historial completo..."
                        bat "git fetch --unshallow"
                    } else {
                        echo "📥 Repositorio ya completo"
                    }
                    
                    // Fetch de tags
                    bat "git fetch --tags --force"
                    
                    updateGitHubStatus('pending', 'Iniciando validación...', 'pr-validation')
                    echo "🔄 Iniciando validación de PR/Push..."
                }
            }
        }

        stage('Crear package.xml con delta') {
            steps {
                script {
                    echo "📦 Creando package.xml de validación usando dif entre ${env.GITHUB_HSU_TAG} y HEAD..."

                    // Verificar que el tag existe antes de continuar
                    def tagExists = bat(script: "git tag -l ${env.GITHUB_HSU_TAG}", returnStdout: true).trim()
                    if (!tagExists) {
                        error "❌ Tag ${env.GITHUB_HSU_TAG} no encontrado en el repositorio"
                    }
                    echo "✅ Tag ${env.GITHUB_HSU_TAG} encontrado: ${tagExists}"

                    // DIAGNÓSTICO: Verificar estructura del proyecto
                    echo "🔍 DIAGNÓSTICO: Verificando estructura del proyecto..."
                    
                    // Verificar sfdx-project.json
                    if (fileExists('sfdx-project.json')) {
                        echo "✅ sfdx-project.json encontrado:"
                        bat "type sfdx-project.json"
                    } else {
                        echo "❌ sfdx-project.json NO encontrado"
                    }
                    
                    // Verificar estructura de directorios
                    echo "📁 Estructura de directorios:"
                    bat "dir /s /b force-app\\main\\default"
                    
                    // Verificar cambios específicos
                    echo "📋 Cambios detectados por git:"
                    bat "git diff --name-status ${env.GITHUB_HSU_TAG}..HEAD"
                    
                    // Verificar tipos de archivo
                    echo "📄 Tipos de archivos modificados:"
                    def changedFiles = bat(script: "git diff --name-only ${env.GITHUB_HSU_TAG}..HEAD", returnStdout: true).trim()
                    echo "Archivos cambiados:"
                    echo changedFiles
                    
                    // Filtrar archivos de Salesforce
                    def sfFiles = []
                    changedFiles.split('\n').each { file ->
                        if (file.endsWith('.cls') || file.endsWith('.trigger') || 
                            file.endsWith('.page') || file.endsWith('.component') || 
                            file.endsWith('-meta.xml')) {
                            sfFiles.add(file)
                        }
                    }
                    echo "📄 Archivos de Salesforce modificados: ${sfFiles.join(', ')}"

                    // Autenticación
                    echo "🔐 Autenticando con Salesforce..."
                    bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                    bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"
                    echo "✅ Autenticación exitosa"

                    // Limpiar y crear carpetas
                    bat "if exist package rmdir /s /q package"
                    bat "if exist manifest rmdir /s /q manifest"
                    bat "mkdir manifest"

                    try {
                        // VERSIÓN MEJORADA: Usar la nueva sintaxis recomendada
                        echo "🔄 Ejecutando sgd para generar delta (versión mejorada)..."
                        
                        // Opción 1: Usar la nueva sintaxis
                        bat "\"${SF_CMD}\" sgd source delta --from \"${env.GITHUB_HSU_TAG}\" --to HEAD --output-dir manifest --generate-delta"
                        
                        // Verificar si se generaron archivos
                        echo "📁 Contenido de manifest después de sgd:"
                        bat "dir manifest"
                        
                        // Verificar archivos específicos
                        if (fileExists('manifest\\package.xml')) {
                            echo "✅ package.xml encontrado"
                            bat "type manifest\\package.xml"
                        }
                        
                        if (fileExists('manifest\\destructiveChanges.xml')) {
                            echo "🗑️ destructiveChanges.xml encontrado"
                            bat "type manifest\\destructiveChanges.xml"
                        }
                        
                        echo "✅ package.xml generado con delta"
                    } catch (Exception e) {
                        echo "❌ Error con nueva sintaxis: ${e.getMessage()}"
                        echo "🔧 Intentando método manual de respaldo..."
                        createManualPackageXml()
                    }

                    // Verificar package.xml final
                    if (fileExists('manifest\\package.xml')) {
                        echo "📄 Contenido final de package.xml:"
                        bat "type manifest\\package.xml"
                        
                        // Verificar que no esté vacío
                        def packageContent = readFile('manifest\\package.xml')
                        if (packageContent.contains('<types>')) {
                            env.SKIP_VALIDATION = "false"
                            echo "✅ package.xml contiene metadata para validar"
                        } else {
                            env.SKIP_VALIDATION = "true"
                            echo "⚠️ package.xml está vacío - sin cambios de metadata"
                        }
                    } else {
                        echo "⚠️ No hay cambios de metadata de Salesforce para validar"
                        echo "✅ Pipeline completado - Sin validación necesaria"
                        env.SKIP_VALIDATION = "true"
                    }
                }
            }
        }

        stage('Validar en Salesforce') {
            when {
                environment name: 'SKIP_VALIDATION', value: 'false'
            }
            steps {
                script {
                    updateGitHubStatus('pending', 'Validando metadatos...', 'pr-validation')
                    echo "🔍 Ejecutando validación (checkOnly) en Salesforce..."

                    try {
                        // Ajusta el testLevel según tus necesidades
                        bat "${SF_CMD} project deploy validate --manifest manifest\\package.xml --test-level RunLocalTests --target-org %SFDX_ALIAS%"
                        updateGitHubStatus('success', 'Validación exitosa', 'pr-validation')
                        echo "✅ Validación completada sin errores"
                    } catch (Exception e) {
                        updateGitHubStatus('failure', 'Error en la validación', 'pr-validation')
                        echo "❌ Validación fallida: ${e.getMessage()}"
                        error "Validación fallida"
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // Limpieza
                bat "if exist auth_url.txt del auth_url.txt"
                echo "🧹 Limpieza completada"
            }
        }
    }
}

def createManualPackageXml() {
    echo "🔧 Creando package.xml manual basado en cambios detectados..."
    
    // Obtener lista de archivos cambiados
    def changedFiles = bat(script: "git diff --name-only ${env.GITHUB_HSU_TAG}..HEAD", returnStdout: true).trim().split('\n')
    
    def packageContent = """<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
"""
    
    def apexClasses = []
    def triggers = []
    def pages = []
    def components = []
    
    // Clasificar archivos por tipo
    changedFiles.each { file ->
        if (file.endsWith('.cls') && file.contains('force-app/main/default/classes/')) {
            def className = file.tokenize('/').last().replace('.cls', '')
            apexClasses.add(className)
        } else if (file.endsWith('.trigger') && file.contains('force-app/main/default/triggers/')) {
            def triggerName = file.tokenize('/').last().replace('.trigger', '')
            triggers.add(triggerName)
        }
        // Agregar más tipos según necesites
    }
    
    // Agregar ApexClass
    if (apexClasses) {
        packageContent += """    <types>
"""
        apexClasses.each { className ->
            packageContent += "        <members>${className}</members>\n"
        }
        packageContent += """        <name>ApexClass</name>
    </types>
"""
    }
    
    // Agregar ApexTrigger
    if (triggers) {
        packageContent += """    <types>
"""
        triggers.each { triggerName ->
            packageContent += "        <members>${triggerName}</members>\n"
        }
        packageContent += """        <name>ApexTrigger</name>
    </types>
"""
    }
    
    packageContent += """    <version>61.0</version>
</Package>"""
    
    // Escribir archivo
    writeFile file: 'manifest\\package.xml', text: packageContent
    echo "✅ package.xml manual creado"
}

def updateGitHubStatus(state, description, context) {
    try {
        def repoUrl = scm.getUserRemoteConfigs()[0].getUrl()
        def repoName = repoUrl.tokenize('/').last().replace('.git', '')
        def repoOwner = repoUrl.tokenize('/')[-2]
        def commitSha = env.GIT_COMMIT
        def targetUrl = "${BUILD_URL}console"

        def payload = [
            state       : state,
            target_url  : targetUrl,
            description : description,
            context     : "jenkins/${context}"
        ]

        def jsonPayload = groovy.json.JsonOutput.toJson(payload)

        withCredentials([usernamePassword(credentialsId: 'github-pat', usernameVariable: 'GH_USER', passwordVariable: 'GH_TOKEN')]) {
            httpRequest(
                acceptType: 'APPLICATION_JSON',
                contentType: 'APPLICATION_JSON',
                httpMode: 'POST',
                requestBody: jsonPayload,
                url: "https://api.github.com/repos/${repoOwner}/${repoName}/statuses/${commitSha}",
                customHeaders: [
                    [name: 'Authorization', value: "token ${GH_TOKEN}"],
                    [name: 'User-Agent', value: 'Jenkins-Pipeline']
                ]
            )
        }

        echo "✅ GitHub status actualizado: ${state} - ${description}"
    } catch (Exception e) {
        echo "⚠️ Error actualizando GitHub status: ${e.getMessage()}"
    }
}