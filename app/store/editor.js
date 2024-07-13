import fs from 'fs';
import { stat, readdir, readFile, access, mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EDITOR_STORE = [];

async function load() {
    try {
        const directory = join(__dirname, "..", "..", "storage");
        const subDirectories = await readdir(directory);
        for (const subDir of subDirectories) {
            // Check if it's a directory
            const stats = await stat(join(directory, subDir));
            if (stats.isDirectory()) {                
                // Define file paths
                const chatJsonPath = join(directory, subDir, 'chat.json');
                const roomJsonPath = join(directory, subDir, 'room.json');
                const contentPath = join(directory, subDir, 'content');
 
                // Load chat.json
                let chatData = {};
                if (await fileExists(chatJsonPath)) {                    
                    chatData = await readAndParseJson(chatJsonPath);               
                }

                // Load room.json
                let roomData = {};
                if (await fileExists(roomJsonPath)) {
                    roomData = await readAndParseJson(roomJsonPath);                
                }
                EDITOR_STORE.push({name: subDir, path: join(directory, subDir), chatData, roomData});
            }
        }        
    } catch (err) { }
    return EDITOR_STORE;
}

async function createSaveEditor(name, owner) {    
    const directory = join(__dirname, "..", "..", "storage", name);
    // si n'existe pas encore
    try {
        const stats = await stat(directory);        
        if (!stats.isDirectory()) throw new Error();   
    } catch (err) {
        if (err.code === 'ENOENT') try { await mkdir(directory); } catch (error) { }
    }

    // Dans tout les cas on 
    try {
        await writeFile( 
            join(directory, 'room.json'), 
            JSON.stringify({name, owner, mode: 'ace/mode/javascript'}, null, 4), 
            'utf8'
        );
        await writeFile(join(directory, 'chat.json'), JSON.stringify({}, null, 4), 'utf8');
        await writeFile(join(directory, 'content'), "", 'utf8');
    } catch (error) {}
}

// Function to check if a file exists
const fileExists = async (filePath) => {
    try {
        await access(filePath, fs.constants.F_OK);
        return true;
    } catch (err) { return false; }
};

// Function to read and parse a JSON file
const readAndParseJson = async (filePath) => {
    try {
        const data = await readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) { return null; }
};

async function content(editor) {
    const contentFile = join(editor.path, 'content');
    try {
        let content = "";
        if (await fileExists(contentFile)) {
            content = await readFile(contentFile, 'utf8');                
        }
        return content;
    } catch (err) { return ""; }
};

async function saveContent(editor, content) {
    const contentFile = join(editor.path, 'content');
    try {
        await writeFile(contentFile, content, 'utf8');
    } catch (err) { return ""; }
};

async function saveLang(editor, lang) {
    const roomFile = join(editor.path, 'room.json');
    editor.roomData.mode = lang;
    try {
        await writeFile(roomFile, JSON.stringify(editor.roomData, null, 4), 'utf8');
    } catch (err) {return ""; }
};


const store = {
    load,
    content,
    createSaveEditor,
    saveContent,
    saveLang
};


export default store;