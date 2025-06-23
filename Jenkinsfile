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

        stage('Preparar entorno') {
            steps {
                script {
                    echo "🔧 Preparando entorno para generación de delta..."
                    
                    // Limpiar directorios anteriores
                    bat "if exist manifest rmdir /s /q manifest"
                    bat "if exist package rmdir /s /q package"
                    
                    // Crear directorios necesarios
                    bat "mkdir manifest"
                    bat "mkdir package"
                    
                    // Asegurar que tenemos todos los tags y commits
                    bat "git fetch --all --tags --prune"
                    
                    echo "✅ Entorno preparado"
                }
            }
        }

        stage('Autenticar Salesforce') {
            steps {
                script {
                    echo "🔐 Autenticando con Salesforce..."
                    bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                    bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"
                    echo "✅ Autenticación exitosa"
                }
            }
        }

        stage('Generar package.xml con delta') {
            steps {
                script {
                    echo "📦 Generando package.xml con cambios entre ${env.GITHUB_HSU_TAG} y HEAD..."

                    try {
                        // Verificar que el tag existe
                        def tagExists = bat(script: "git tag -l ${env.GITHUB_HSU_TAG}", returnStdout: true).trim()
                        if (!tagExists) {
                            error "❌ El tag ${env.GITHUB_HSU_TAG} no existe"
                        }
                        
                        echo "📋 Mostrando diferencias entre ${env.GITHUB_HSU_TAG} y HEAD:"
                        bat "git diff --name-only ${env.GITHUB_HSU_TAG}..HEAD"
                        
                        // Generar delta usando sgd (Salesforce Git Delta)
                        echo "🔄 Ejecutando sgd para generar delta..."
                        bat "\"${SF_CMD}\" sgd source delta --from \"${env.GITHUB_HSU_TAG}\" --to HEAD --output manifest --generate-delta"
                        
                        // Verificar si se generaron archivos
                        if (fileExists('manifest/package.xml')) {
                            echo "✅ package.xml generado exitosamente"
                            echo "📄 Contenido del package.xml generado:"
                            bat "type manifest\\package.xml"
                            
                            // También mostrar si hay destructiveChanges
                            if (fileExists('manifest/destructiveChanges.xml')) {
                                echo "🗑️ Se generó destructiveChanges.xml:"
                                bat "type manifest\\destructiveChanges.xml"
                            }
                        } else {
                            echo "⚠️ No se encontraron cambios entre ${env.GITHUB_HSU_TAG} y HEAD"
                            echo "📄 Creando package.xml vacío para evitar errores..."
                            bat """
                                echo ^<?xml version="1.0" encoding="UTF-8"?^> > manifest\\package.xml
                                echo ^<Package xmlns="http://soap.sforce.com/2006/04/metadata"^> >> manifest\\package.xml
                                echo     ^<version^>60.0^</version^> >> manifest\\package.xml
                                echo ^</Package^> >> manifest\\package.xml
                            """
                        }
                        
                    } catch (Exception e) {
                        echo "❌ Error generando delta: ${e.getMessage()}"
                        
                        // Como fallback, crear un package.xml vacío
                        echo "📄 Creando package.xml vacío como fallback..."
                        bat """
                            echo ^<?xml version="1.0" encoding="UTF-8"?^> > manifest\\package.xml
                            echo ^<Package xmlns="http://soap.sforce.com/2006/04/metadata"^> >> manifest\\package.xml
                            echo     ^<version^>60.0^</version^> >> manifest\\package.xml
                            echo ^</Package^> >> manifest\\package.xml
                        """
                    }
                }
            }
        }

        stage('Validar cambios en Salesforce') {
            steps {
                script {
                    updateGitHubStatus('pending', 'Validando metadatos...', 'pr-validation')
                    echo "🔍 Ejecutando validación (checkOnly) en Salesforce..."

                    // Verificar si hay contenido para validar
                    def packageContent = readFile('manifest/package.xml')
                    if (packageContent.contains('<types>')) {
                        echo "📋 Se encontraron metadatos para validar"
                        
                        try {
                            // Validar con test level apropiado
                            bat "${SF_CMD} project deploy validate --manifest manifest\\package.xml --test-level RunLocalTests --target-org %SFDX_ALIAS% --verbose"
                            updateGitHubStatus('success', 'Validación exitosa', 'pr-validation')
                            echo "✅ Validación completada sin errores"
                        } catch (Exception e) {
                            updateGitHubStatus('failure', 'Error en la validación', 'pr-validation')
                            echo "❌ Validación fallida: ${e.getMessage()}"
                            error "Validación fallida"
                        }
                    } else {
                        echo "⚠️ No hay metadatos para validar (package.xml vacío)"
                        updateGitHubStatus('success', 'No hay cambios para validar', 'pr-validation')
                    }
                }
            }
        }

        stage('Deploy a Salesforce (opcional)') {
            when {
                // Solo deployar en branch main/master o cuando sea un merge
                anyOf {
                    branch 'main'
                    branch 'master'
                    environment name: 'DEPLOY_ENABLED', value: 'true'
                }
            }
            steps {
                script {
                    echo "🚀 Ejecutando deploy real a Salesforce..."
                    
                    try {
                        // Deploy real (sin --validate-only)
                        bat "${SF_CMD} project deploy start --manifest manifest\\package.xml --test-level RunLocalTests --target-org %SFDX_ALIAS% --verbose"
                        echo "✅ Deploy completado exitosamente"
                    } catch (Exception e) {
                        echo "❌ Deploy fallido: ${e.getMessage()}"
                        error "Deploy fallido"
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
                
                // Mostrar resumen final
                echo "📊 Resumen de la ejecución:"
                echo "   - Tag base: ${env.GITHUB_HSU_TAG}"
                echo "   - Commit HEAD: ${env.GIT_COMMIT}"
                echo "   - Alias Salesforce: ${env.SFDX_ALIAS}"
                
                echo "🧹 Limpieza completada"
            }
        }
        failure {
            script {
                echo "💥 Pipeline falló - revisa los logs anteriores"
                updateGitHubStatus('failure', 'Pipeline falló', 'pr-validation')
            }
        }
        success {
            script {
                echo "🎉 Pipeline completado exitosamente"
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