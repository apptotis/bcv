const fs = require('fs');

const text = fs.readFileSync('extracted_text_utf8.txt', 'utf8');
const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');

const athletes = [];
let currentAthlete = null;

const associationStart = "AB Viana do";

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const licenseMatch = line.match(/^(\d{6})\s+(.*)$/);
    
    if (licenseMatch) {
        if (currentAthlete) athletes.push(currentAthlete);
        currentAthlete = {
            licenca: licenseMatch[1],
            nome_parts: [licenseMatch[2]],
            full_lines: [line],
            associationFound: false
        };
    } else if (currentAthlete) {
        currentAthlete.full_lines.push(line);
        
        if (!currentAthlete.associationFound) {
            if (line.includes(associationStart)) {
                currentAthlete.associationFound = true;
                // If the line has name parts before "AB Viana", extract them
                const beforeAssoc = line.split(associationStart)[0].trim();
                if (beforeAssoc) currentAthlete.nome_parts.push(beforeAssoc);
            } else {
                currentAthlete.nome_parts.push(line);
            }
        }
    }
}
if (currentAthlete) athletes.push(currentAthlete);

function fixEncoding(str) {
    if (!str) return str;
    return str
        .replace(/├®/g, 'é')
        .replace(/├¡/g, 'í')
        .replace(/├│/g, 'ó')
        .replace(/├║/g, 'ú')
        .replace(/├á/g, 'à')
        .replace(/├â/g, 'Â')
        .replace(/├ó/g, 'â')
        .replace(/├¬/g, 'ê')
        .replace(/├┤/g, 'ô')
        .replace(/├ú/g, 'ã')
        .replace(/├╡/g, 'õ')
        .replace(/├º/g, 'ç')
        .replace(/├ì/g, 'Í')
        .replace(/├ô/g, 'Ô')
        .replace(/├ë/g, 'É')
        .replace(/S├®nior/g, 'Sénior')
        .replace(/Valen├ºa/g, 'Valença');
}

const processedAthletes = athletes.map(a => {
    const nome = fixEncoding(a.nome_parts.join(' ').replace(/\s+/g, ' ').trim());
    
    const fullText = a.full_lines.join(' ');
    const dateMatch = fullText.match(/(\d{4}-\d{2}-\d{2})/);
    const birthDate = dateMatch ? dateMatch[1] : null;
    
    let gender = "M";
    if (fullText.includes("Feminino")) gender = "F";
    else if (fullText.includes("Masculino")) gender = "M";
    
    let escalao = "";
    if (fullText.includes("Sub 14") || fullText.includes("Sub-14")) escalao = "Sub-14";
    else if (fullText.includes("Sub 16") || fullText.includes("Sub-16")) escalao = "Sub-16";
    else if (fullText.includes("Sub 18") || fullText.includes("Sub-18")) escalao = "Sub-18";
    else if (fullText.includes("Mini 8")) escalao = "Mini 8";
    else if (fullText.includes("Mini 10")) escalao = "Mini 10";
    else if (fullText.includes("Mini 12")) escalao = "Mini 12";
    else if (fullText.includes("Sénior") || fullText.includes("S├®nior")) escalao = "Seniores";
    else if (fullText.includes("Baby-")) escalao = "Mini 8";
    
    let nationality = "";
    const lastLine = a.full_lines[a.full_lines.length - 1];
    nationality = fixEncoding(lastLine.split(/\s+/).pop());
    
    // Special case for Cabo Verde
    if (fullText.includes("Cabo Verde")) nationality = "Cabo Verde";

    let equipa = escalao;
    if (gender === "M") equipa += " Masculino";
    else if (gender === "F") equipa += " Feminino";

    return {
        nome: nome,
        licenca: a.licenca,
        equipa: equipa,
        escalao: escalao,
        sexo: gender,
        data_nascimento: birthDate,
        nacionalidade: nationality,
        numero_camisola: null
    };
}).filter(a => a !== null && a.nome.length > 2);

fs.writeFileSync('athletes_data.json', JSON.stringify(processedAthletes, null, 2));
console.log(`Parsed ${processedAthletes.length} athletes.`);
