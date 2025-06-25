pipeline {
    agent { label 'windows' }

    environment {
        GITHUB_TOKEN = credentials('github-pat') 
        GITHUB_REPO = 'Manug0/La-Rioja-dev'
        GITHUB_BRANCH = 'dev'
        GITHUB_PR_NUMBER = env.CHANGE_ID
        GITHUB_SHA = env.GIT_COMMIT

        AUTH_FILE_PATH = 'C:\\tmp\\sfdx-auth.json'
        SF_DEPLOYMENT_URL = ''
        SF_DEPLOYMENT_STATUS = ''
        SF_DISABLE_TELEMETRY = 'true'
        GITHUB_TAG = 'HSU_START'

        LAST_COMMIT_SHA = ''
    }

    stages {
        stage('Inicio') {
            steps {
                script {
                    echo "🔁 Validación para PR #${GITHUB_PR_NUMBER}"
                    githubCommitStatus('pending', 'Validación en progreso...')
                }
            }
        }

        stage('Obtener último commit desde GitHub') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'github-pat', variable: 'TOKEN')]) {
                        def authHeader = "Authorization: Bearer ${TOKEN}"
                        def apiURL = "https://api.github.com/repos/${GITHUB_REPO}/branches/${GITHUB_BRANCH}"
                        def command = "curl -s -H \"${authHeader}\" \"${apiURL}\" > branch_info.json"
                        bat command

                        def branchInfo = readJSON file: 'branch_info.json'
                        env.LAST_COMMIT_SHA = branchInfo.commit.sha
                        echo "🔎 Último SHA en ${GITHUB_BRANCH}: ${env.LAST_COMMIT_SHA}"
                    }
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                script {
                    bat 'sf.cmd config set disable-telemetry true --global'
                    bat 'echo y | sf.cmd plugins install sfdx-git-delta'
                    bat 'echo y | sf.cmd plugins install sfdx-hardis'
                    bat 'npm install yaml fs'
                }
            }
        }

        stage('Autenticarse en Salesforce') {
            steps {
                script {
                    withCredentials([file(credentialsId: 'SFDX_AUTH_URL_HSU', variable: 'AUTH_FILE')]) {
                        bat "copy %AUTH_FILE% %AUTH_FILE_PATH%"
                        bat 'sf.cmd org login sfdx-url --sfdx-url-file %AUTH_FILE_PATH% --set-default'
                    }
                }
            }
        }

        stage('Delta y Validación') {
            steps {
                script {
                    bat 'git fetch origin'
                    bat "sf.cmd sgd source delta --from ${GITHUB_TAG} --to ${env.LAST_COMMIT_SHA} --output ."
                    bat 'cd package && dir'

                    def testList = bat(script: 'node scripts/utilities/readTestFile.js', returnStdout: true).trim()

                    def deployOutput = bat(script: "sf.cmd project deploy validate --manifest package/package.xml --json --test-level RunSpecifiedTests --tests ${testList}", returnStdout: true)
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
                }
            }
        }
    }

    post {
        success {
            script {
                githubCommitStatus('success', 'Validación exitosa ✅')
                githubCommentPR("✅ Validación completada con éxito. [Ver en Salesforce](${env.SF_DEPLOYMENT_URL})")
            }
        }

        failure {
            script {
                githubCommitStatus('failure', 'Falló la validación ❌')
                githubCommentPR("❌ Validación fallida. Verifica en Salesforce: ${env.SF_DEPLOYMENT_URL}")
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
