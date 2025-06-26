pipeline {
    agent any
    environment {
        GITHUB_TOKEN = credentials('GITHUB-PAT') 
        GITHUB_REPO = 'Manug0/La-Rioja-dev'
        GITHUB_BRANCH = 'dev'
        GITHUB_LAST_COMMIT = ''
        GITHUB_TAG = 'HSU_START'

        VALIDATE_ENV = 'dev'

        AUTH_FILE_PATH = 'C:\\tmp\\sfdx-auth.json'
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'
        SF_DEPLOYMENT_URL = ''
        SF_DEPLOYMENT_STATUS = ''
        ERROR_MESSAGE = 'XX'
        SF_DISABLE_TELEMETRY = 'true'

    }
    stages {
        stage("Leer información de GitHub") {
            steps {
                script {
                    def branchInfoUrl = "https://api.github.com/repos/${GITHUB_REPO}/branches/${GITHUB_BRANCH}"
                    def response = httpRequest(
                        httpMode: 'GET',
                        customHeaders: [[name: 'Authorization', value: "token ${GITHUB_TOKEN}"]],
                        url: branchInfoUrl,
                        validResponseCodes: '200'
                    )

                    def branchInfo = readJSON text: response.content
                    GITHUB_LAST_COMMIT = branchInfo.commit.sha
                    echo "Último commit SHA: ${GITHUB_LAST_COMMIT}"
                }
            }
        }
        stage("Instalar dependencias") {
            steps {
                bat """
                    sfdx plugins:install sfdx-git-delta --force
                    npm install yaml fs
                """
            }
        }
        stage("Descargar proyecto Git") {
            steps {
                script {
                    bat "if exist La-Rioja-dev rmdir /s /q La-Rioja-dev"
                    bat "set GIT_SSL_NO_VERIFY=true && git clone https://github.com/${GITHUB_REPO}.git"
                }
            }
        }
        stage("Crear package.xml") {
            steps {
                dir('La-Rioja-dev') {
                    script {
                        try {
                            echo "🔄 Generando delta entre ${GITHUB_TAG} y ${GITHUB_LAST_COMMIT}"
                            bat "\"${SF_CMD}\" sgd source delta --from ${GITHUB_TAG} --to ${GITHUB_LAST_COMMIT} --output ."
                            
                            if (fileExists('package\\package.xml')) {
                                echo "📦 Package.xml generado con cambios:"
                                bat "type package\\package.xml"
                                env.HAS_CHANGES = 'true'
                            } else {
                                echo "✅ Sin cambios de metadata entre ${GITHUB_TAG} y ${GITHUB_LAST_COMMIT}"
                                echo "🏁 Pipeline completado - No hay nada que validar"
                                env.HAS_CHANGES = 'false'
                            }
                        } catch (err) {
                            echo "❌ Error generando package: ${err.getMessage()}"
                            currentBuild.result = 'FAILURE'
                            throw err
                        }
                    }
                }
            }
        }
        stage("Validar package.xml") {
            when {
                environment name: 'HAS_CHANGES', value: 'true'
            }
            steps {
                dir('La-Rioja-dev') {
                    script {
                        try {
                            bat "git switch dev"
                            
                            // Verificar si existe package.xml
                            if (!fileExists('package\\package.xml')) {
                                echo "⚠️ No hay package.xml - Sin cambios para validar"
                                echo "✅ Pipeline completado exitosamente"
                                return
                            }
                            
                            echo "📦 Contenido final del package.xml:"
                            bat "type package\\package.xml"
                            
                            // Leer tests
                            bat "node scripts\\utilities\\readTestFile.js > tests.txt"
                            def testList = readFile('tests.txt').trim()
                            
                            echo "🧪 Tests configurados: ${testList}"
                            
                            if (!testList || testList.isEmpty()) {
                                echo "⚠️ No hay tests configurados - Usando RunLocalTests"
                                bat "\"${SF_CMD}\" project deploy validate --manifest package\\package.xml --test-level RunLocalTests"
                            } else {
                                echo "🧪 Ejecutando tests específicos: ${testList}"
                                bat "\"${SF_CMD}\" project deploy validate --manifest package\\package.xml --test-level RunSpecifiedTests --tests ${testList}"
                            }
                            
                        } catch (err) {
                            echo "❌ Error en validación: ${err.getMessage()}"
                            currentBuild.result = 'FAILURE'
                            throw err
                        }
                    }
                }
            }
        }
    }
    post {
        success {
            echo "Validación completada correctamente ✅"
        }
        failure {
            echo "Falló la validación del paquete ❌"
        }
    }


}


//     stages {
//         stage('Obtener último commit desde GitHub') {
//             steps {
//                 script {
//                     try {
//                         withCredentials([string(credentialsId: 'GITHUB-PAT', variable: 'TOKEN')]) {
//                             // Escribe el token en un archivo temporal para evitar interpolación directa
//                             writeFile file: 'token.txt', text: TOKEN
//                             def apiURL = "https://api.github.com/repos/${GITHUB_REPO}/branches/${GITHUB_BRANCH}"
//                             // Usa el archivo temporal en el comando curl
//                             bat 'set /p TOKEN=<token.txt && curl -s -H "Authorization: Bearer %TOKEN%" "' + apiURL + '" > branch_info.json'
//                             bat "type branch_info.json" // Para depuración

//                             def branchInfo = readJSON file: 'branch_info.json'
//                             def sha = branchInfo.commit.sha?.toString()
//                             echo "SHA encontrado: ${sha}"
//                             GITHUB_LAST_COMMIT = sha
//                         }
//                     } catch (err) {
//                         echo "❌ Error en 'Obtener último commit desde GitHub': ${err.getMessage()}"
//                         echo "${err}"
//                         currentBuild.result = 'FAILURE'
//                         throw err
//                     }
//                 }
//             }
//         }
//         stage('Instalar dependencias') {
//             steps {
//                 script {
//                     try {
//                         bat "${SF_CMD} config set disable-telemetry true --global"
//                         bat "echo y | ${SF_CMD} plugins install sfdx-git-delta"
//                         bat "echo y | ${SF_CMD} plugins install sfdx-hardis"
//                         bat "npm install yaml fs"
//                     } catch (err) {
//                         echo "❌ Error en 'Instalar dependencias': ${err.getMessage()}"
//                         echo "${err}"
//                         currentBuild.result = 'FAILURE'
//                         throw err
//                     }
//                 }
//             }
//         }
//         stage('Autenticarse en Salesforce') {
//             steps {
//                 script {
//                     try {
//                         withCredentials([string(credentialsId: 'SFDX_AUTH_URL_HSU', variable: 'SFDX_AUTH_URL')]) {
//                             // Crear archivo temporal con la URL
//                             writeFile file: 'sfdx_auth_url.txt', text: SFDX_AUTH_URL
//                             bat "\"${SF_CMD}\" org login sfdx-url --sfdx-url-file sfdx_auth_url.txt --set-default"
//                             // Limpiar archivo temporal
//                             bat "del sfdx_auth_url.txt"
//                         }
//                     } catch (err) {
//                         echo "❌ Error en 'Autenticarse en Salesforce': ${err.getMessage()}"
//                         echo "${err}"
//                         currentBuild.result = 'FAILURE'
//                         throw err
//                     }
//                 }
//             }
//         }
//         stage("Descargar proyecto git"){
//             steps{
//                 sh "GIT_SSL_NO_VERIFY=true git clone https://${GITLAB_USER_AUTH}:${GITLAB_API_TOKEN}@10.254.113.3/salesforce/tesa/sf-bien.git"
//             }
//         }
//         stage("crear package.xml"){
//             steps{
//                 dir('sf-bien'){
//                     echo "Creando package.xml"
//                     sh "ls -l"
//                     sh "sf sgd source delta --from  ${GITLAB_FIRST_COMMIT} --to ${GITLAB_LAST_COMMIT}   --output '.' "
//                     sh "cd package && ls -l"
//                     sh "cat package/package.xml"
//                 }
//             }
//         }
//         stage('Delta y Validación') {
//             steps {
//                 script {
//                     try {
//                         bat 'git fetch origin'
                        
//                         // Limpiar directorios anteriores
//                         bat 'if exist package rmdir /s /q package'
//                         bat 'if exist manifest rmdir /s /q manifest'
//                         bat 'mkdir manifest'
                        
//                         echo "🔄 Generando delta entre ${GITHUB_TAG} y ${GITHUB_LAST_COMMIT}..."
                        
//                         // Comando sgd corregido
//                         bat "\"${SF_CMD}\" sgd source delta --from ${GITHUB_TAG} --to ${GITHUB_LAST_COMMIT} --output manifest --generate-delta"
                        
//                         // Verificar y mostrar el contenido del package.xml generado
//                         if (fileExists('manifest\\package.xml')) {
//                             echo "📦 Contenido del package.xml generado:"
//                             bat "type manifest\\package.xml"
//                         } else {
//                             echo "⚠️ No se generó package.xml - Sin cambios de metadata"
//                             echo "🔄 Creando package.xml básico para validación..."
                            
//                             def basicPackageXml = '''<?xml version="1.0" encoding="UTF-8"?>
//                                 <Package xmlns="http://soap.sforce.com/2006/04/metadata">
//                                     <types>
//                                         <members>HSU_SistemasUpdater</members>
//                                         <name>ApexClass</name>
//                                     </types>
//                                     <version>59.0</version>
//                                 </Package>'''
                            
//                             writeFile file: 'manifest\\package.xml', text: basicPackageXml
//                             echo "✅ Package.xml básico creado"
//                         }

//                         def testConfig = readYaml file: 'test-config.yaml'
//                         def extraTests = testConfig.tests.extra_tests
//                         def testList = extraTests.join(',')
                        
//                         echo "🧪 Tests a ejecutar: ${testList}"

//                         def deployOutput = bat(script: "\"${SF_CMD}\" project deploy validate --manifest manifest/package.xml --json --test-level RunSpecifiedTests --tests ${testList}", returnStdout: true)
//                         def json = new groovy.json.JsonSlurper().parseText(deployOutput)

//                         env.SF_DEPLOYMENT_URL = json.result.deployUrl
//                         env.SF_DEPLOYMENT_STATUS = json.status.toString()

//                         echo "📎 Deployment URL: ${env.SF_DEPLOYMENT_URL}"
//                         echo "📌 Status: ${env.SF_DEPLOYMENT_STATUS}"

//                         if (env.SF_DEPLOYMENT_STATUS != '0') {
//                             currentBuild.result = 'FAILURE'
//                             env.ERROR_MESSAGE = 'Error en validación Salesforce'
//                             error("❌ Falló validación SF")
//                         }
//                     } catch (err) {
//                         echo "❌ Error en 'Delta y Validación': ${err.getMessage()}"
//                         echo "${err}"
//                         currentBuild.result = 'FAILURE'
//                         throw err
//                     }
//                 }
//             }
//         }
//     }
//     post {
//         success {
//             script {
//                 githubCommitStatus('success', 'Validación exitosa ✅')
//             }
//         }
//         failure {
//             script {
//                 githubCommitStatus('failure', 'Falló la validación ❌')
//             }
//         }
//     }
// }

// def githubCommitStatus(String state, String description) {
//     def body = """
//     {
//         "state": "${state}",
//         "description": "${description}",
//         "context": "Jenkins CI"
//     }
//     """
//     def url = "https://api.github.com/repos/${env.GITHUB_REPO}/statuses/${env.GITHUB_SHA}"

//     withCredentials([string(credentialsId: 'GITHUB-PAT', variable: 'GITHUB_TOKEN')]) {
//         httpRequest(
//             acceptType: 'APPLICATION_JSON',
//             contentType: 'APPLICATION_JSON',
//             customHeaders: [[name: 'Authorization', value: "token ${GITHUB_TOKEN}"]],
//             httpMode: 'POST',
//             requestBody: body,
//             url: url,
//             validResponseCodes: '200:299'
//         )
//     }
// }
