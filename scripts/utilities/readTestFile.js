// scripts/utilities/readTestFile.js
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

function readTestConfiguration() {
    try {
        // Leer archivo YAML de configuración
        const configPath = path.join(__dirname, '../../test-config.yaml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents);
        
        // Obtener el ambiente desde variables de entorno o usar desarrollo por defecto
        const environment = process.env.DEPLOY_ENV || 'development';
        
        // Obtener los tests para el ambiente específico
        const envConfig = config.environments[environment];
        
        if (!envConfig) {
            console.error(`Configuración para ambiente '${environment}' no encontrada`);
            process.exit(1);
        }
        
        // Si hay tests específicos definidos, usarlos; si no, usar los core tests
        let testList = envConfig.tests;
        if (!testList || testList.length === 0) {
            testList = config.tests.core_tests;
        }
        
        // Convertir array a string separado por comas
        const testString = testList.join(',');
        
        console.log(testString);
        return testString;
        
    } catch (error) {
        console.error('Error leyendo configuración de tests:', error.message);
        
        // Fallback: usar tests por defecto
        const defaultTests = 'HSU_SistemasUpdater_TEST,HSU_UTSUpdater_TEST';
        console.log(defaultTests);
        return defaultTests;
    }
}

// Si se ejecuta directamente, imprimir los tests
if (require.main === module) {
    readTestConfiguration();
}

module.exports = { readTestConfiguration };