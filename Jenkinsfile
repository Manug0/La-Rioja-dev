pipeline {
    agent any
    environment {
        GITHUB_TOKEN = credentials('github-pat') 
        GITHUB_REPO = 'Manug0/La-Rioja-dev'
        GITHUB_BRANCH = 'dev'

        AUTH_FILE_PATH = 'C:\\tmp\\sfdx-auth.json'
        SF_DEPLOYMENT_URL = ''
        SF_DEPLOYMENT_STATUS = ''
        ERROR_MESSAGE = 'XX'
        SF_DISABLE_TELEMETRY = 'true'
        GITHUB_TAG = 'HSU_START'

        LAST_COMMIT_SHA = ''
        GITHUB_PR_NUMBER = ''
    }
    stages {
        stage('Inicio') {
            steps {
                script {
                    if (env.CHANGE_ID) {
                        env.GITHUB_PR_NUMBER = env.CHANGE_ID
                        echo "✅ PR detectado desde CHANGE_ID: #${env.GITHUB_PR_NUMBER}"
                    } else if (env.ghprbPullId) {
                        env.GITHUB_PR_NUMBER = env.ghprbPullId
                        echo "✅ PR detectado desde ghprbPullId: #${env.GITHUB_PR_NUMBER}"
                    } else {
                        // Intentar obtener PR desde la branch
                        def branchName = env.BRANCH_NAME ?: env.GIT_BRANCH
                        if (branchName && branchName.startsWith('PR-')) {
                            env.GITHUB_PR_NUMBER = branchName.replaceAll('PR-', '').replaceAll('/.*', '')
                            echo "✅ PR extraído del nombre de branch: #${env.GITHUB_PR_NUMBER}"
                        } else {
                            // Buscar PR asociado al commit actual
                            env.GITHUB_PR_NUMBER = getPRFromCommit(env.GIT_COMMIT)
                            if (env.GITHUB_PR_NUMBER && env.GITHUB_PR_NUMBER != 'null') {
                                echo "✅ PR encontrado por commit: #${env.GITHUB_PR_NUMBER}"
                            } else {
                                echo "⚠️ No se pudo determinar el número de PR. Modo de desarrollo/test."
                                env.GITHUB_PR_NUMBER = 'dev-build'
                            }
                        }
                    }

                    env.GITHUB_SHA = env.GIT_COMMIT
                    echo "🔁 Validación para PR #${env.GITHUB_PR_NUMBER}"
                    echo "📋 SHA del commit: ${env.GITHUB_SHA}"
                    
                    // Solo actualizar status si tenemos un PR válido
                    if (env.GITHUB_PR_NUMBER && env.GITHUB_PR_NUMBER != 'dev-build' && env.GITHUB_PR_NUMBER != 'null') {
                        githubCommitStatus('pending', 'Validación en progreso...')
                    }
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
                if (env.GITHUB_PR_NUMBER && env.GITHUB_PR_NUMBER != 'dev-build' && env.GITHUB_PR_NUMBER != 'null') {
                    githubCommitStatus('success', 'Validación exitosa ✅')
                    githubCommentPR("✅ Validación completada con éxito. [Ver en Salesforce](${env.SF_DEPLOYMENT_URL})")
                } else {
                    echo "✅ Validación completada (modo desarrollo)"
                }
            }
        }
        failure {
            script {
                if (env.GITHUB_PR_NUMBER && env.GITHUB_PR_NUMBER != 'dev-build' && env.GITHUB_PR_NUMBER != 'null') {
                    githubCommitStatus('failure', 'Falló la validación ❌')
                    githubCommentPR("❌ Validación fallida. Verifica en Salesforce: ${env.SF_DEPLOYMENT_URL}")
                } else {
                    echo "❌ Validación fallida (modo desarrollo)"
                }
            }
        }
    }
}

def getPRFromCommit(String commitSha) {
    if (!commitSha) return null
    
    try {
        withCredentials([string(credentialsId: 'github-pat', variable: 'TOKEN')]) {
            def authHeader = "Authorization: Bearer ${TOKEN}"
            def apiURL = "https://api.github.com/repos/${env.GITHUB_REPO}/commits/${commitSha}/pulls"
            def command = "curl -s -H \"${authHeader}\" \"${apiURL}\" > pr_info.json"
            bat command

            def prInfo = readJSON file: 'pr_info.json'
            if (prInfo && prInfo.size() > 0) {
                return prInfo[0].number.toString()
            }
        }
    } catch (Exception e) {
        echo "⚠️ Error al buscar PR por commit: ${e.getMessage()}"
    }
    return null
}

def githubCommitStatus(String state, String description) {
    if (!env.GITHUB_SHA) {
        echo "⚠️ No hay SHA disponible para actualizar status"
        return
    }
    
    def body = """
    {
        "state": "${state}",
        "description": "${description}",
        "context": "Jenkins CI"
    }
    """
    def url = "https://api.github.com/repos/${env.GITHUB_REPO}/statuses/${env.GITHUB_SHA}"

    try {
        withCredentials([string(credentialsId: 'github-pat', variable: 'GITHUB_TOKEN')]) {
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
        echo "✅ GitHub status actualizado: ${state}"
    } catch (Exception e) {
        echo "⚠️ Error al actualizar GitHub status: ${e.getMessage()}"
    }
}

def githubCommentPR(String message) {
    if (!env.GITHUB_PR_NUMBER || env.GITHUB_PR_NUMBER == 'null' || env.GITHUB_PR_NUMBER == 'dev-build') {
        echo "⚠️ No hay PR válido para comentar"
        return
    }
    
    def url = "https://api.github.com/repos/${env.GITHUB_REPO}/issues/${env.GITHUB_PR_NUMBER}/comments"
    def body = """{ "body": "${message}" }"""

    try {
        withCredentials([string(credentialsId: 'github-pat', variable: 'GITHUB_TOKEN')]) {
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
        echo "✅ Comentario añadido al PR #${env.GITHUB_PR_NUMBER}"
    } catch (Exception e) {
        echo "⚠️ Error al comentar en PR: ${e.getMessage()}"
    }
}