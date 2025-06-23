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
                    echo "📦 Creando package.xml de validación usando dif entre ${env.GITHUB_HSU_TAG} y HEAD..."

                    // Asegúrate de tener los tags locales
                    bat "git fetch --tags"

                    // Autenticación
                    echo "🔐 Autenticando con Salesforce..."
                    bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                    bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"
                    echo "✅ Autenticación exitosa"

                    // Limpiar y crear carpetas
                    bat "if exist package rmdir /s /q package"
                    bat "if exist manifest rmdir /s /q manifest"
                    bat "mkdir package"
                    bat "mkdir manifest"

                    try {
                        // Mostrar diferencias para debugging
                        echo "📋 Mostrando diferencias entre ${env.GITHUB_HSU_TAG} y HEAD:"
                        bat "git diff --name-only ${env.GITHUB_HSU_TAG}..HEAD"
                        
                        // Generar delta con sgd usando --output-dir (no --output que está deprecated)
                        echo "🔄 Ejecutando sgd para generar delta..."
                        bat "\"${SF_CMD}\" sgd source delta --from \"${env.GITHUB_HSU_TAG}\" --to HEAD --output-dir manifest --generate-delta"
                        
                        // SGD puede generar el package.xml en diferentes ubicaciones, verificar ambas
                        def packageXmlPath = ''
                        if (fileExists('manifest/package.xml')) {
                            packageXmlPath = 'manifest/package.xml'
                            echo "✅ package.xml encontrado en manifest/"
                        } else if (fileExists('package/package.xml')) {
                            packageXmlPath = 'package/package.xml'
                            echo "✅ package.xml encontrado en package/, moviendo a manifest/"
                            // Mover a manifest para consistencia
                            bat "copy package\\package.xml manifest\\package.xml"
                            if (fileExists('package/destructiveChanges.xml')) {
                                bat "copy package\\destructiveChanges.xml manifest\\destructiveChanges.xml"
                            }
                        }
                        
                        if (packageXmlPath && fileExists('manifest/package.xml')) {
                            echo "✅ package.xml generado exitosamente"
                            echo "📄 Contenido del package.xml generado:"
                            bat "type manifest\\package.xml"
                            
                            // También mostrar si hay destructiveChanges
                            if (fileExists('manifest/destructiveChanges.xml')) {
                                echo "🗑️ Se generó destructiveChanges.xml:"
                                bat "type manifest\\destructiveChanges.xml"
                            }
                        } else {
                            echo "❌ No se encontró package.xml generado por SGD"
                        }
                        
                        echo "✅ package.xml generado con delta"
                    } catch (Exception e) {
                        echo "❌ Error generando delta: ${e.getMessage()}"
                    }

                    // Verificar package.xml final
                    if (fileExists('manifest\\package.xml')) {
                        echo "📄 Contenido final de package.xml:"
                        bat "type manifest\\package.xml"
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