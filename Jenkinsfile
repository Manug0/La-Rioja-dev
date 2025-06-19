pipeline {
    agent any
    environment {
        SFDX_AUTH_URL = credentials('SFDX_AUTH_URL_HSU')
        SFDX_ALIAS = 'hsu'
        PACKAGE_DIR = 'force-app'
        SF_DISABLE_TELEMETRY = "true"
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'
        GITHUB_TOKEN = credentials('github-pat')
    }
    
    stages {
        stage('Checkout') { 
            steps { 
                checkout scm
                script {
                    updateGitHubStatus('pending', 'Iniciando validación de PR...', 'pr-validation')
                    
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
                    updateGitHubStatus('pending', 'Analizando cambios...', 'pr-validation')
                    
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
                    updateGitHubStatus('pending', 'Verificando herramientas...', 'pr-validation')
                    
                    echo "🔧 Verificando SFDX CLI..."
                    bat "${SF_CMD} --version"
                    echo "✅ SFDX CLI verificado"
                }
            }
        }
        
        stage('Authenticate') {
            steps {
                script {
                    updateGitHubStatus('pending', 'Autenticando con Salesforce...', 'pr-validation')
                    
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
                    updateGitHubStatus('pending', 'Preparando package de validación...', 'pr-validation')
                    
                    echo "📦 Creando package.xml..."
                    bat "if not exist package mkdir package"
                    
                    if (env.COMMITS_VALID == "true") {
                        echo "🔄 Intentando crear package.xml con delta de commits..."
                        
                        try {
                            def pluginCheck = bat(script: "${SF_CMD} plugins | findstr sfdx-git-delta", returnStatus: true)
                            
                            if (pluginCheck == 0) {
                                echo "✅ Plugin sfdx-git-delta encontrado, generando delta..."
                                bat "\"${SF_CMD}\" sgd source delta --from \"${env.PREVIOUS_COMMIT}\" --to \"${env.CURRENT_COMMIT}\" --output . --generate-delta"
                                
                                // Copiar el package.xml generado como deploy.xml
                                if (fileExists('package\\package.xml')) {
                                    bat "copy package\\package.xml deploy.xml"
                                    echo "✅ deploy.xml generado con delta exitosamente"
                                    
                                    // Analizar clases en el package y añadir sus tests
                                    addTestsToPackage('deploy.xml')
                                } else {
                                    echo "⚠️ No se generó package.xml, usando package básico"
                                    createBasicPackage()
                                }
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
                    
                    // Verificar que deploy.xml existe
                    bat "if exist deploy.xml (echo ✅ deploy.xml creado exitosamente) else (echo ❌ ERROR: deploy.xml no encontrado)"
                    
                    if (fileExists('deploy.xml')) {
                        echo "📄 Contenido del deploy.xml:"
                        bat "type deploy.xml"
                    }
                }
            }
        }
        
        stage('Definir tests') {
            steps {
                script {
                    echo "🧪 Configurando tests basados en el package..."
                    
                    if (fileExists('deploy.xml')) {
                        // Extraer tests del deploy.xml
                        env.TEST_FLAGS = extractTestsFromPackage('deploy.xml')
                        echo "✅ Tests configurados desde deploy.xml: ${env.TEST_FLAGS}"
                    } else {
                        echo "⚠️ deploy.xml no encontrado, usando configuración por defecto"
                        env.TEST_FLAGS = "--tests HSU_SistemasUpdater_TEST --tests HSU_UTSUpdater_TEST"
                    }
                }
            }
        }
        
        stage('Validar código') {
            steps {
                script {
                    updateGitHubStatus('pending', 'Ejecutando validación y tests...', 'pr-validation')
                    
                    echo "🔍 Iniciando validación de código..."
                    try {
                        if (fileExists('deploy.xml')) {
                            echo "📦 Validando con deploy.xml y tests específicos: ${env.TEST_FLAGS}"
                            bat "${SF_CMD} project deploy validate --manifest deploy.xml --test-level RunSpecifiedTests ${env.TEST_FLAGS} --target-org %SFDX_ALIAS%"
                        } else {
                            echo "📁 deploy.xml no encontrado, usando validación de directorios"
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
                // Notificar éxito a GitHub
                updateGitHubStatus('success', 'PR validado exitosamente - Listo para merge', 'pr-validation')
                
                echo """
╔══════════════════════════════════════════════════════════════╗
║                    ✅ VALIDACIÓN EXITOSA                     ║
╠══════════════════════════════════════════════════════════════╣
║ PR: ${env.CHANGE_TITLE}                                      
║ Autor: ${env.CHANGE_AUTHOR}                                  
║ Branch: ${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET}         
║ Tests ejecutados: ${env.TEST_FLAGS}                          
║                                                              ║
║ 🟢 GitHub Status: APROBADO                                  ║
║ 🟢 Estado: PR listo para merge                              ║
╚══════════════════════════════════════════════════════════════╝
"""
                
                currentBuild.description = "✅ Validación exitosa - PR aprobado en GitHub"
                currentBuild.result = 'SUCCESS'
            }
        }
        failure { 
            script {
                // Notificar fallo a GitHub
                updateGitHubStatus('failure', 'Validación falló - Revisar errores antes de merge', 'pr-validation')
                
                echo """
╔══════════════════════════════════════════════════════════════╗
║                     ❌ VALIDACIÓN FALLIDA                    ║
╠══════════════════════════════════════════════════════════════╣
║ PR: ${env.CHANGE_TITLE}                                      
║ Autor: ${env.CHANGE_AUTHOR}                                  
║ Branch: ${env.CHANGE_BRANCH} -> ${env.CHANGE_TARGET}         
║                                                              ║
║ 🔴 GitHub Status: RECHAZADO                                 ║
║ 🔴 Estado: PR bloqueado para merge                           ║
║                                                              ║
║ Ver detalles en: ${BUILD_URL}console                        ║
╚══════════════════════════════════════════════════════════════╝
"""
                
                currentBuild.description = "❌ Validación fallida - PR bloqueado en GitHub"
                currentBuild.result = 'FAILURE'
            }
        }
        aborted {
            script {
                // Notificar cancelación a GitHub
                updateGitHubStatus('error', 'Validación cancelada - Re-ejecutar pipeline', 'pr-validation')
                
                echo "⏹️ Validación cancelada - Status enviado a GitHub"
                currentBuild.description = "⏹️ Validación cancelada"
            }
        }
    }
}

// Función para crear deploy.xml básico
def createBasicPackage() {
    def packageXml = '''<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>HSU_SistemasUpdater</members>
        <members>HSU_SistemasUpdater_TEST</members>
        <name>ApexClass</name>
    </types>
    <version>59.0</version>
</Package>'''
    
    writeFile file: 'deploy.xml', text: packageXml
    echo "✅ deploy.xml básico creado"
}

def updateGitHubStatus(state, description, context) {
    try {
        def repoUrl = scm.getUserRemoteConfigs()[0].getUrl()
        def repoName = repoUrl.tokenize('/').last().replace('.git', '')
        def repoOwner = repoUrl.tokenize('/')[-2]
        
        def commitSha = env.GIT_COMMIT
        def targetUrl = "${BUILD_URL}console"
        
        def payload = [
            state: state,
            target_url: targetUrl,
            description: description,
            context: "jenkins/${context}"
        ]
        
        def jsonPayload = groovy.json.JsonOutput.toJson(payload)
        
        def response = httpRequest(
            acceptType: 'APPLICATION_JSON',
            contentType: 'APPLICATION_JSON',
            httpMode: 'POST',
            requestBody: jsonPayload,
            url: "https://api.github.com/repos/${repoOwner}/${repoName}/statuses/${commitSha}",
            customHeaders: [
                [name: 'Authorization', value: 'token ' + GITHUB_TOKEN_PSW],
                [name: 'User-Agent', value: 'Jenkins-Pipeline']
            ]
        )
        
        echo "✅ GitHub status actualizado: ${state} - ${description}"
        
    } catch (Exception e) {
        echo "⚠️ Error actualizando GitHub status: ${e.getMessage()}"
        // No fallar el pipeline si no se puede actualizar GitHub
    }
}

// Función para añadir tests automáticamente al package basándose en las clases incluidas
def addTestsToPackage(packageFile) {
    try {
        echo "🔍 Analizando clases en el package para añadir tests..."
        
        def packageContent = readFile(packageFile)
        def apexClasses = []
        
        // Extraer nombres de clases Apex del XML
        def lines = packageContent.split('\n')
        boolean inApexSection = false
        
        for (line in lines) {
            if (line.contains('<name>ApexClass</name>')) {
                inApexSection = true
                continue
            }
            if (inApexSection && line.contains('</types>')) {
                break
            }
            if (inApexSection && line.contains('<members>') && !line.contains('*')) {
                def className = line.replaceAll(/.*<members>([^<]+)<\/members>.*/, '$1').trim()
                if (!className.endsWith('_TEST')) {
                    apexClasses.add(className)
                }
            }
        }
        
        echo "📋 Clases encontradas: ${apexClasses}"
        
        // Buscar tests correspondientes y añadirlos
        def testsToAdd = []
        for (className in apexClasses) {
            def testClassName = className + '_TEST'
            if (fileExists("force-app/main/default/classes/${testClassName}.cls")) {
                testsToAdd.add(testClassName)
                echo "✅ Test encontrado: ${testClassName}"
            } else {
                echo "⚠️ No se encontró test para: ${className}"
            }
        }
        
        if (testsToAdd.size() > 0) {
            // Añadir tests al package XML
            def updatedPackage = addTestsToXml(packageContent, testsToAdd)
            writeFile file: packageFile, text: updatedPackage
            echo "✅ Tests añadidos al package: ${testsToAdd}"
        }
        
    } catch (Exception e) {
        echo "⚠️ Error añadiendo tests al package: ${e.getMessage()}"
    }
}

// Función para añadir tests al XML
def addTestsToXml(xmlContent, testsToAdd) {
    def lines = xmlContent.split('\n').toList()
    def newLines = []
    boolean inApexSection = false
    boolean testsAdded = false
    
    for (line in lines) {
        newLines.add(line)
        
        if (line.contains('<name>ApexClass</name>')) {
            inApexSection = true
        }
        
        if (inApexSection && line.contains('</types>') && !testsAdded) {
            // Añadir tests antes de cerrar la sección ApexClass
            def indentSpaces = line.replaceAll(/^(\s*).*/, '$1') // Mantener indentación
            for (testClass in testsToAdd) {
                newLines.add(newLines.size() - 1, "${indentSpaces}    <members>${testClass}</members>")
            }
            testsAdded = true
            inApexSection = false
        }
    }
    
    return newLines.join('\n')
}

// Función para extraer tests del package y generar flags para el comando
def extractTestsFromPackage(packageFile) {
    try {
        def packageContent = readFile(packageFile)
        def testClasses = []
        
        def lines = packageContent.split('\n')
        boolean inApexSection = false
        
        for (line in lines) {
            if (line.contains('<name>ApexClass</name>')) {
                inApexSection = true
                continue
            }
            if (inApexSection && line.contains('</types>')) {
                break
            }
            if (inApexSection && line.contains('<members>') && !line.contains('*')) {
                def className = line.replaceAll(/.*<members>([^<]+)<\/members>.*/, '$1').trim()
                if (className.endsWith('_TEST')) {
                    testClasses.add(className)
                }
            }
        }
        
        if (testClasses.size() > 0) {
            return testClasses.collect { "--tests ${it}" }.join(' ')
        } else {
            echo "⚠️ No se encontraron test classes en el package, usando configuración por defecto"
            return "--tests HSU_SistemasUpdater_TEST --tests HSU_UTSUpdater_TEST"
        }
        
    } catch (Exception e) {
        echo "⚠️ Error extrayendo tests del package: ${e.getMessage()}"
        return "--tests HSU_SistemasUpdater_TEST --tests HSU_UTSUpdater_TEST"
    }
}