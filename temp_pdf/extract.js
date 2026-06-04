const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('../Listagem Jogadores.pdf');

pdf(dataBuffer).then(function(data) {
    // number of pages
    console.log("PAGES:", data.numpages);
    // number of rendered pages
    console.log("RENDERED PAGES:", data.numrender);
    // PDF info
    console.log("INFO:", data.info);
    // PDF metadata
    console.log("METADATA:", data.metadata); 
    // PDF.js version
    // check https://mozilla.github.io/pdf.js/getting_started/
    console.log("VERSION:", data.version);
    // PDF text
    console.log("TEXT_START");
    console.log(data.text);
    console.log("TEXT_END");
});
