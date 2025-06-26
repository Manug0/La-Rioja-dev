pipeline {
    agent any
    environment {
        GITHUB_TOKEN = credentials('GITHUB-PAT') 
        GITHUB_REPO = 'Manug0/La-Rioja-dev'
        GITHUB_BRANCH = 'dev'

        AUTH_FILE_PATH = 'C:\\tmp\\sfdx-auth.json'
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'
        SF_DEPLOYMENT_URL = ''
        SF_DEPLOYMENT_STATUS = ''
        ERROR_MESSAGE = 'XX'
        SF_DISABLE_TELEMETRY = 'true'
        GITHUB_TAG = 'HSU_START'

        LAST_COMMIT_SHA = ''
    }
    stages {
        stage('Obtener último commit desde GitHub') {
            steps {
                script {
                    try {
                        withCredentials([string(credentialsId: 'GITHUB-PAT', variable: 'TOKEN')]) {
                            // Escribe el token en un archivo temporal para evitar interpolación directa
                            writeFile file: 'token.txt', text: TOKEN
                            def apiURL = "https://api.github.com/repos/${GITHUB_REPO}/branches/${GITHUB_BRANCH}"
                            // Usa el archivo temporal en el comando curl
                            bat 'set /p TOKEN=<token.txt && curl -s -H "Authorization: Bearer %TOKEN%" "' + apiURL + '" > branch_info.json'
                            bat "type branch_info.json" // Para depuración

                            def branchInfo = readJSON file: 'branch_info.json'
                            def sha = branchInfo.commit.sha?.toString()
                            echo "SHA encontrado: ${sha}"
                            LAST_COMMIT_SHA = sha
                        }
                    } catch (err) {
                        echo "❌ Error en 'Obtener último commit desde GitHub': ${err.getMessage()}"
                        echo "${err}"
                        currentBuild.result = 'FAILURE'
                        throw err
                    }
                }
            }
        }
        stage('Instalar dependencias') {
            steps {
                script {
                    try {
                        bat "${SF_CMD} config set disable-telemetry true --global"
                        bat "echo y | ${SF_CMD} plugins install sfdx-git-delta"
                        bat "echo y | ${SF_CMD} plugins install sfdx-hardis"
                        bat "npm install yaml fs"
                    } catch (err) {
                        echo "❌ Error en 'Instalar dependencias': ${err.getMessage()}"
                        echo "${err}"
                        currentBuild.result = 'FAILURE'
                        throw err
                    }
                }
            }
        }
        stage('Autenticarse en Salesforce') {
            steps {
                script {
                    try {
                        withCredentials([string(credentialsId: 'SFDX_AUTH_URL_HSU', variable: 'SFDX_AUTH_URL')]) {
                            // Crear archivo temporal con la URL
                            writeFile file: 'sfdx_auth_url.txt', text: SFDX_AUTH_URL
                            bat "\"${SF_CMD}\" org login sfdx-url --sfdx-url-file sfdx_auth_url.txt --set-default"
                            // Limpiar archivo temporal
                            bat "del sfdx_auth_url.txt"
                        }
                    } catch (err) {
                        echo "❌ Error en 'Autenticarse en Salesforce': ${err.getMessage()}"
                        echo "${err}"
                        currentBuild.result = 'FAILURE'
                        throw err
                    }
                }
            }
        }
        stage('Delta y Validación') {
            steps {
                script {
                    try {
                        bat 'git fetch origin'
                        bat "\"${SF_CMD}\" sgd source delta --from ${GITHUB_TAG} --to ${LAST_COMMIT_SHA} --output ."
                        bat 'cd package && dir'

                        def testConfig = readYaml file: 'test-config.yaml'
                        def extraTests = testConfig.tests.extra_tests
                        def testList = extraTests.join(',')
                        
                        echo "🧪 Tests a ejecutar: ${testList}"

                        def deployOutput = bat(script: "\"${SF_CMD}\" project deploy validate --manifest package/package.xml --json --test-level RunSpecifiedTests --tests ${testList}", returnStdout: true)
                        def json = new groovy.json.JsonSlurper().parseText(deployOutput)

                        env.SF_DEPLOYMENT_URL = json.result.deployUrl
                        env.SF_DEPLOYMENT_STATUS = json.status.toString()

                        echo "📎 Deployment URL: ${env.SF_DEPLOYMENT_URL}"
                        echo "📌 Status: ${env.SF_DEPLOYMENT_STATUS}"

                        if (env.SF_DEPLOYMENT_STATUS != '0') {
                            currentBuild.result = 'FAILURE'
                            env.ERROR_MESSAGE = 'Error en validación Salesforce'
                            error("❌ Falló validación SF")
                        }
                    } catch (err) {
                        echo "❌ Error en 'Delta y Validación': ${err.getMessage()}"
                        echo "${err}"
                        currentBuild.result = 'FAILURE'
                        throw err
                    }
                }
            }
        }
    }
    post {
        success {
            script {
                githubCommitStatus('success', 'Validación exitosa ✅')
                // githubCommentPR("✅ Validación completada con éxito. [Ver en Salesforce](${env.SF_DEPLOYMENT_URL})")
            }
        }
        failure {
            script {
                githubCommitStatus('failure', 'Falló la validación ❌')
                // githubCommentPR("❌ Validación fallida. Verifica en Salesforce: ${env.SF_DEPLOYMENT_URL}")
            }
        }
    }
}

def githubCommitStatus(String state, String description) {
    def body = """
    {
        "state": "${state}",
        "description": "${description}",
        "context": "Jenkins CI"
    }
    """
    def url = "https://api.github.com/repos/${env.GITHUB_REPO}/statuses/${env.GITHUB_SHA}"

    withCredentials([string(credentialsId: 'GITHUB-PAT', variable: 'GITHUB_TOKEN')]) {
        httpRequest(
            acceptType: 'APPLICATION_JSON',
            contentType: 'APPLICATION_JSON',
            customHeaders: [[name: 'Authorization', value: "token ${GITHUB_TOKEN}"]],
            httpMode: 'POST',
            requestBody: body,
            url: url,
            validResponseCodes: '200:299'
        )
    }
}

def githubCommentPR(String message) {
    def url = "https://api.github.com/repos/${env.GITHUB_REPO}/issues/${env.GITHUB_PR_NUMBER}/comments"
    def body = """{ "body": "${message}" }"""

    httpRequest(
        acceptType: 'APPLICATION_JSON',
        contentType: 'APPLICATION_JSON',
        customHeaders: [[name: 'Authorization', value: "token ${env.GITHUB_TOKEN}"]],
        httpMode: 'POST',
        requestBody: body,
        url: url,
        validResponseCodes: '200:299'
    )
}
