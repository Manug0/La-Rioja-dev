pipeline {
    agent any
    environment {
        SFDX_AUTH_URL = credentials('SFDX_AUTH_URL_HSU')
        SFDX_ALIAS = 'hsu'
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
                                bat "\"${SF_CMD}\" sgd source delta --from \"${env.PREVIOUS_COMMIT}\" --to \"${env.CURRENT_COMMIT}\" --output manifest --generate-delta"

                                if (fileExists('package\\package.xml')) {
                                    echo "✅ package.xml generado con delta exitosamente"
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

                    // Verificar que package.xml existe
                    bat "if exist package.xml (echo ✅ package.xml creado exitosamente) else (echo ❌ ERROR: package.xml no encontrado)"

                    if (fileExists('package.xml')) {
                        echo "📄 Contenido del package.xml:"
                        bat "type package.xml"
                    }
                }
            }
        }

        stage('Definir tests') {
            steps {
                script {
                    echo "🧪 Configurando tests desde test-config.yaml..."
                    def testConfig = readYaml file: 'test-config.yaml'
                    def coreTests = testConfig.tests.core_tests ?: []
                    def extraTests = testConfig.tests.extra_tests ?: []
                    def allTests = coreTests + extraTests
                    if (allTests.size() > 0) {
                        env.TEST_FLAGS = allTests.collect { "--tests ${it}" }.join(' ')
                        echo "✅ Tests configurados: ${env.TEST_FLAGS}"
                    } else {
                        echo "⚠️ No se encontraron tests en test-config.yaml, usando configuración por defecto"
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
                        bat "${SF_CMD} project deploy validate --manifest package.xml --test-level RunSpecifiedTests ${env.TEST_FLAGS} --target-org %SFDX_ALIAS%"
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
                updateGitHubStatus('success', 'Pipeline finalizado', 'pr-validation')
                echo "🧹 Limpieza finalizada"
            }
        }
        failure {
            script {
                updateGitHubStatus('failure', 'Pipeline fallido', 'pr-validation')
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
        <name>ApexClass</name>
    </types>
    <version>59.0</version>
</Package>'''

    writeFile file: 'package.xml', text: packageXml
    echo "✅ package.xml básico creado"
}

// Función para actualizar el estado en GitHub
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

        withCredentials([string(credentialsId: 'github-pat', variable: 'GH_TOKEN')]) {
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
        // No fallar el pipeline si no se puede actualizar GitHub
    }
}