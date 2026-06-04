const fs = require('fs');

const athletes = JSON.parse(fs.readFileSync('athletes_data.json', 'utf8'));

let sql = "INSERT INTO atletasbcv (nome, licenca, equipa, escalao, sexo, data_nascimento, nacionalidade)\nVALUES\n";

const values = athletes.map(a => {
    const nome = a.nome.replace(/'/g, "''");
    const licenca = a.licenca;
    const equipa = a.equipa.replace(/'/g, "''");
    const escalao = a.escalao.replace(/'/g, "''");
    const sexo = a.sexo;
    const data_nascimento = a.data_nascimento ? `'${a.data_nascimento}'` : 'NULL';
    const nacionalidade = a.nacionalidade.replace(/'/g, "''");
    
    return `('${nome}', '${licenca}', '${equipa}', '${escalao}', '${sexo}', ${data_nascimento}, '${nacionalidade}')`;
});

sql += values.join(',\n') + ";";

fs.writeFileSync('import_athletes.sql', sql);
console.log("SQL script generated: import_athletes.sql");
