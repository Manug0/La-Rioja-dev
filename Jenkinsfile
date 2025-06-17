pipeline {
    agent any
    environment {
        SFDX_AUTH_URL = credentials('SFDX_AUTH_URL_HSU')
        SFDX_ALIAS = 'hsu'
        PACKAGE_DIR = 'force-app'
        SF_DISABLE_TELEMETRY = "true"
        SF_CMD = 'C:\\Users\\Manu\\AppData\\Local\\sf\\client\\2.92.7-df40848\\bin\\sf.cmd'

        GITHUB_TOKEN = credentials('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')
        REPO_OWNER = 'Manug0'
        REPO_NAME = 'La-Rioja-dev'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    updateGitHubStatus('pending', '🔄 Validación en curso - PR en revisión')
                }
            }
        }

        stage('Obtener información Git') {
            steps {
                script {
                    try {
                        def gitLog = bat(script: "git log --oneline -n 2", returnStdout: true).trim()
                        echo "Últimos 2 commits:\n${gitLog}"

                        def currentCommit = bat(script: "git rev-parse HEAD", returnStdout: true).trim()
                        def previousCommit = bat(script: "git rev-parse HEAD~1", returnStdout: true).trim()

                        env.CURRENT_COMMIT = currentCommit.replaceAll(/[\r\n\s]/, '')
                        env.PREVIOUS_COMMIT = previousCommit.replaceAll(/[\r\n\s]/, '')

                        if (env.CURRENT_COMMIT.length() == 40 && env.PREVIOUS_COMMIT.length() == 40) {
                            env.COMMITS_VALID = "true"
                        } else {
                            env.COMMITS_VALID = "false"
                        }
                    } catch (Exception e) {
                        echo "Error obteniendo información de Git: ${e.getMessage()}"
                        env.COMMITS_VALID = "false"
                    }
                }
            }
        }

        stage('Verificar SFDX') {
            steps {
                bat "${SF_CMD} --version"
            }
        }

        stage('Authenticate') {
            steps {
                bat 'echo %SFDX_AUTH_URL% > auth_url.txt'
                bat "${SF_CMD} org login sfdx-url --sfdx-url-file auth_url.txt --alias %SFDX_ALIAS%"
            }
        }

        stage('Crear package.xml') {
            steps {
                script {
                    bat "if not exist package mkdir package"

                    if (env.COMMITS_VALID == "true") {
                        try {
                            def pluginCheck = bat(script: "${SF_CMD} plugins | findstr sfdx-git-delta", returnStatus: true)
                            if (pluginCheck == 0) {
                                bat "\"${SF_CMD}\" sgd source delta --from \"${env.PREVIOUS_COMMIT}\" --to \"${env.CURRENT_COMMIT}\" --output ."
                            } else {
                                createBasicPackage()
                            }
                        } catch (Exception e) {
                            createBasicPackage()
                        }
                    } else {
                        createBasicPackage()
                    }

                    if (fileExists('package\\package.xml')) {
                        bat "type package\\package.xml"
                    }
                }
            }
        }

        stage('Definir tests') {
            steps {
                script {
                    def yamlText = readFile 'test-config.yaml'
                    def parsedYaml = new org.yaml.snakeyaml.Yaml().load(yamlText)

                    if (!(parsedYaml instanceof Map)) {
                        error "El archivo YAML no contiene una estructura válida"
                    }

                    def testList = parsedYaml.tests?.core_tests
                    if (testList == null || !(testList instanceof List)) {
                        error "No se encontraron tests en el YAML o el formato es incorrecto"
                    }

                    env.TEST_FLAGS = testList.collect { "--tests ${it}" }.join(' ')
                    echo "Tests a ejecutar: ${testList}"
                }
            }
        }

        stage('Validar código') {
            steps {
                script {
                    try {
                        if (fileExists('package\\package.xml')) {
                            bat "${SF_CMD} project deploy validate --manifest package\\package.xml --test-level RunSpecifiedTests ${env.TEST_FLAGS} --target-org %SFDX_ALIAS%"
                        } else {
                            bat "${SF_CMD} project deploy validate --source-dir force-app/main/default/classes --target-org %SFDX_ALIAS% --test-level RunSpecifiedTests ${env.TEST_FLAGS}"
                        }
                    } catch (Exception e) {
                        throw e
                    }
                }
            }
        }
    }

    post {
        always {
            bat "if exist auth_url.txt del auth_url.txt"
        }
        success {
            script {
                updateGitHubStatus('success', '✅ Validación exitosa - PR listo para merge')
                addPRComment("""
## ✅ Validación Exitosa

**Estado:** PR aprobado para merge
**Tests ejecutados:** Todos los tests pasaron correctamente
**Package.xml:** Generado exitosamente

🟢 **Acción requerida:** Este PR puede ser mergeado de forma segura.

---
*Validación completada en: ${new Date()}*
""")
            }
        }
        failure {
            script {
                updateGitHubStatus('failure', '❌ Validación fallida - NO mergear')
                addPRComment("""
## ❌ Validación Fallida

**Estado:** PR rechazado - NO MERGEAR
**Error:** La validación ha fallado

🔴 **Acción requerida:** 
1. Revisa los logs de Jenkins para más detalles
2. Corrige los errores encontrados
3. Haz push de los cambios para re-ejecutar la validación

---
*Validación fallida en: ${new Date()}*
**Log de Jenkins:** [Ver detalles](${BUILD_URL}console)
""")
            }
        }
    }
}

def createBasicPackage() {
    def packageXml = '''<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>HSU_SistemasUpdater</members>
        <members>HSU_UTSUpdater</members>
        <members>HSU_SistemasUpdater_TEST</members>
        <members>HSU_UTSUpdater_TEST</members>
        <name>ApexClass</name>
    </types>
    <types>
        <members>HSU_GlobalLists__c</members>
        <name>CustomObject</name>
    </types>
    <version>59.0</version>
</Package>'''
    writeFile file: 'package/package.xml', text: packageXml
}

def updateGitHubStatus(String state, String description) {
    try {
        bat """
        curl -X POST ^
        -H \"Authorization: token ${env.GITHUB_TOKEN}\" ^
        -H \"Accept: application/vnd.github.v3+json\" ^
        \"https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/statuses/${env.GIT_COMMIT}\" ^
        -d \"{\\\"state\\\": \\\"${state}\\\", \\\"description\\\": \\\"${description}\\\", \\\"context\\\": \\\"Jenkins/validation\\\"}\"
        """
    } catch (Exception e) {
        echo "Error actualizando GitHub status: ${e.getMessage()}"
    }
}

def addPRComment(String comment) {
    try {
        def prNumber = env.CHANGE_ID
        bat """
        curl -X POST ^
        -H \"Authorization: token ${env.GITHUB_TOKEN}\" ^
        -H \"Accept: application/vnd.github.v3+json\" ^
        \"https://api.github.com/repos/${env.REPO_OWNER}/${env.REPO_NAME}/issues/${prNumber}/comments\" ^
        -d \"{\\\"body\\\": \\\"${comment.replace('"', '\\\"').replace('\n', '\\n')}\\\"}\"
        """
    } catch (Exception e) {
        echo "Error agregando comentario al PR: ${e.getMessage()}"
    }
}