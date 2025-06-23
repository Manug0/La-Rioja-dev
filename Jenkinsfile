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
                    updateGitHubStatus('pending', 'Iniciando validación...', 'pr-validation')
                    echo "🔄 Iniciando validación de PR/Push..."
                }
            }
        }

        stage('Crear package.xml con delta') {
            steps {
                script {
                    echo "📦 Creando package.xml de validación usando dif entre HSU_START y HEAD..."

                    // Autenticación
                    echo "🔐 Autenticando con Salesforce..."
                    bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                    bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"
                    echo "✅ Autenticación exitosa"

                    // Determinar commits
                    def fromCommit = bat(script: "git rev-list -n 1 HSU_START", returnStdout: true).trim()
                    def toCommit = bat(script: "git rev-parse HEAD", returnStdout: true).trim()

                    echo "Generando delta entre ${fromCommit} (HSU_START) y ${toCommit} (HEAD)..."

                    // Crear carpeta package
                    bat "if not exist package mkdir package"

                    try {
                        // Generar delta con sgd
                        bat "\"${SF_CMD}\" sgd source delta --from ${GITHUB_HSU_TAG} --to \"${toCommit}\" --output package --generate-delta"
                        echo "✅ package.xml generado con delta"
                    } catch (Exception e) {
                        echo "❌ Error generando delta: ${e.getMessage()}"
                    }

                    // Verificar package.xml
                    if (fileExists('package\\package.xml')) {
                        echo "📄 Contenido de package.xml:"
                        bat "type package\\package.xml"
                    } else {
                        echo "❌ No se generó package.xml"
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
                        bat "${SF_CMD} project deploy validate --manifest package\\package.xml --test-level RunLocalTests --target-org %SFDX_ALIAS%"
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
    }
}