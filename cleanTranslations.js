const fs = require('fs-extra');
const glob = require('glob');

const PROJECT_DIR = './';
const TRANSLATION_DIR = './apps/web/public/static/locales';
const regex = /([`'"])(.*?)\1/g;
const regexConcatenated = /t\(\s*(['"`])([^'"`]*?)\${[^}]*}[^'"`]*?\1\s*\)/g;
const regexTemplateLiteral = /\[`?\$\{t\((['"`])(.*?)\1\)\}\]?/g;

const getUsedKeys = (dir) => {
    const usedKeys = new Set();
    glob.sync(`${dir}/**/*.{ts,tsx}`).forEach((file) => {
        if (fs.statSync(file).isFile()) { 
            const content = fs.readFileSync(file, 'utf8');
            
            let match;
            while ((match = regex.exec(content)) !== null) {
                usedKeys.add(match[2]);
            }

            while ((match = regexConcatenated.exec(content)) !== null) {
                let key = match[2];
                key = key.replace(/[`'"]/g, '').split(/\s*\+\s*/).join('');
                usedKeys.add(key);
            }

            while ((match = regexTemplateLiteral.exec(content)) !== null) {
                let key = match[2]; 
                usedKeys.add(key);
              }
        }
    });
    return usedKeys;
};

const cleanTranslations = (translationDir, usedKeys) => {
    glob.sync(`${translationDir}/**/common.json`).forEach((file) => {
        const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
        const cleanedTranslations = Object.fromEntries(
            Object.entries(translations).filter(([key]) => usedKeys.has(key))
        );
        fs.writeFileSync(file, JSON.stringify(cleanedTranslations, null, 2));
        console.log(`Cleaned: ${file}`);
    });
};

const main = () => {
    const usedKeys = getUsedKeys(PROJECT_DIR);
    cleanTranslations(TRANSLATION_DIR, usedKeys);
};

main();

