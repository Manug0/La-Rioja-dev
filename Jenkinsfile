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
                        // Mostrar diferencias para debugging
                        echo "📋 Mostrando diferencias entre ${env.GITHUB_HSU_TAG} y HEAD:"
                        bat "git diff --name-only ${env.GITHUB_HSU_TAG}..HEAD"
                        
                        // Generar delta con sgd
                        echo "🔄 Ejecutando sgd para generar delta..."
                        bat "\"${SF_CMD}\" sgd source delta --from \"${env.GITHUB_HSU_TAG}\" --to HEAD --output manifest --generate-delta"
                        
                        echo "✅ package.xml generado con delta"
                    } catch (Exception e) {
                        echo "❌ Error generando delta: ${e.getMessage()}"
                        error "Fallo al generar package.xml"
                    }

                    // Verificar package.xml final
                    if (fileExists('manifest\\package.xml')) {
                        echo "📄 Contenido final de package.xml:"
                        bat "type manifest\\package.xml"
                    } else {
                        error "❌ No se generó package.xml en manifest/"
                    }
                }
            }
        }

        stage('Validar en Salesforce') {
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