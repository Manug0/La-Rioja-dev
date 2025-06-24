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
                    echo "🔄 Iniciando validación de PR/Push..."

                    def commitSha = env.GIT_COMMIT
                    def repoUrl = scm.getUserRemoteConfigs()[0].getUrl()
                    def repoName = repoUrl.tokenize('/').last().replace('.git', '')
                    def repoOwner = repoUrl.tokenize('/')[-2]
                    def targetUrl = "${env.BUILD_URL}console"

                    def curlCommand = """
                        curl -X POST https://api.github.com/repos/${repoOwner}/${repoName}/statuses/${commitSha} ^
                        -H "Authorization: token ${GITHUB_TOKEN}" ^
                        -H "Content-Type: application/json" ^
                        -d "{\\"state\\": \\"pending\\", \\"target_url\\": \\"${targetUrl}\\", \\"description\\": \\"Iniciando validación...\\", \\"context\\": \\"jenkins/pr-validation\\"}"
                    """
                    bat curlCommand
                }
            }
        }

        stage('Crear package.xml con delta') {
            steps {
                script {
                    echo "📦 Creando package.xml de validación usando dif entre ${env.GITHUB_HSU_TAG} y HEAD..."

                    bat "git fetch --tags"
                    bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                    bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"

                    bat "if exist package rmdir /s /q package"
                    bat "if exist manifest rmdir /s /q manifest"
                    bat "mkdir package"
                    bat "mkdir manifest"

                    def tagExists = bat(script: "git rev-parse --verify ${env.GITHUB_HSU_TAG}", returnStatus: true) == 0
                    if (!tagExists) {
                        error "❌ El tag '${env.GITHUB_HSU_TAG}' no existe"
                    }

                    bat "git diff --name-only ${env.GITHUB_HSU_TAG}..HEAD"
                    def sgdExit = bat(script: "\"${SF_CMD}\" sgd source delta --from \"${env.GITHUB_HSU_TAG}\" --to HEAD --output-dir manifest --generate-delta", returnStatus: true)
                    if (sgdExit != 0) error "❌ Error ejecutando sgd"

                    if (fileExists('manifest/package.xml')) {
                        echo "✅ package.xml generado en manifest/"
                    } else if (fileExists('package/package.xml')) {
                        bat "copy package\\package.xml manifest\\package.xml"
                        if (fileExists('package/destructiveChanges.xml')) {
                            bat "copy package\\destructiveChanges.xml manifest\\destructiveChanges.xml"
                        }
                    }

                    if (fileExists('manifest/package.xml')) {
                        bat "type manifest\\package.xml"
                        if (fileExists('manifest/destructiveChanges.xml')) {
                            bat "type manifest\\destructiveChanges.xml"
                        }
                    } else {
                        echo "❌ No se generó package.xml"
                    }
                }
            }
        }

        stage('Validar en Salesforce') {
            steps {
                script {
                    echo "🔍 Ejecutando validación (checkOnly) en Salesforce..."

                    try {
                        bat "${SF_CMD} project deploy validate --manifest manifest\\package.xml --test-level RunLocalTests --target-org %SFDX_ALIAS%"

                        def commitSha = env.GIT_COMMIT
                        def repoUrl = scm.getUserRemoteConfigs()[0].getUrl()
                        def repoName = repoUrl.tokenize('/').last().replace('.git', '')
                        def repoOwner = repoUrl.tokenize('/')[-2]
                        def targetUrl = "${env.BUILD_URL}console"

                        def curlCommand = """
                            curl -X POST https://api.github.com/repos/${repoOwner}/${repoName}/statuses/${commitSha} ^
                            -H "Authorization: token ${GITHUB_TOKEN}" ^
                            -H "Content-Type: application/json" ^
                            -d "{\\"state\\": \\"success\\", \\"target_url\\": \\"${targetUrl}\\", \\"description\\": \\"Validación exitosa\\", \\"context\\": \\"jenkins/pr-validation\\"}"
                        """
                        bat curlCommand

                        echo "✅ Validación completada sin errores"
                    } catch (Exception e) {
                        def commitSha = env.GIT_COMMIT
                        def repoUrl = scm.getUserRemoteConfigs()[0].getUrl()
                        def repoName = repoUrl.tokenize('/').last().replace('.git', '')
                        def repoOwner = repoUrl.tokenize('/')[-2]
                        def targetUrl = "${env.BUILD_URL}console"

                        def curlCommand = """
                            curl -X POST https://api.github.com/repos/${repoOwner}/${repoName}/statuses/${commitSha} ^
                            -H "Authorization: token ${GITHUB_TOKEN}" ^
                            -H "Content-Type: application/json" ^
                            -d "{\\"state\\": \\"failure\\", \\"target_url\\": \\"${targetUrl}\\", \\"description\\": \\"Error en la validación\\", \\"context\\": \\"jenkins/pr-validation\\"}"
                        """
                        bat curlCommand

                        error "❌ Validación fallida: ${e.getMessage()}"
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                bat "if exist auth_url.txt del auth_url.txt"
                echo "🧹 Limpieza completada"
            }
        }
    }
}
