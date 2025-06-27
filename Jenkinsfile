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
                            
                            // Crear archivo .sgdignore temporal si no existe
                            if (!fileExists('.sgdignore')) {
                                echo "📝 Creando archivo .sgdignore temporal..."
                                writeFile file: '.sgdignore', text: '''
                                **/*_TEST.cls
                                **/*Test.cls
                                **/*Tests.cls
                                '''
                            }
                            
                            // Usar el archivo .sgdignore
                            bat "\"${SF_CMD}\" sgd source delta --from ${GITHUB_TAG} --to ${GITHUB_LAST_COMMIT} --output . --ignore .sgdignore"
                            
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
                                bat "\"${SF_CMD}\" project deploy validate --manifest package\\package.xml --test-level RunLocalTests --target-org pre"
                            } else {
                                echo "🧪 Ejecutando tests específicos: ${testList}"
                                bat "\"${SF_CMD}\" project deploy validate --manifest package\\package.xml --test-level RunSpecifiedTests --tests ${testList} --target-org pre"
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