import i18n from 'i18n';
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({path:'.env'});


const directory = dirname(fileURLToPath(import.meta.url));
const frFilePath = join(directory, 'locales', process.env.LANGUAGE+'.json');

// Vérifiez si le fichier de langue existe
if (!existsSync(frFilePath)) { process.env.LANGUAGE = 'fr_FR'; } 

i18n.configure({
    locales: ['en_EN', 'fr_FR'],
    directory: join(directory, 'locales'),
    defaultLocale: process.env.LANGUAGE || 'fr_FR',
    extension: '.json',
    autoReload: true,
    updateFiles: false
});

export default i18n;