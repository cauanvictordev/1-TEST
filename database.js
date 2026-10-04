const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(path.join(__dirname, 'tarefas.db'));

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONCLUÍDA')),
        data_criacao TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      )`, (error) => {
        if (error) return reject(error);
        db.get('SELECT COUNT(*) AS total FROM tarefas', (countError, row) => {
          if (countError) return reject(countError);
          if (row.total > 0) return resolve();
          const insert = db.prepare('INSERT INTO tarefas (titulo, descricao, status) VALUES (?, ?, ?)');
          const samples = [
            ['Revisar proposta do projeto', 'Conferir os últimos detalhes e enviar para aprovação.', 'PENDENTE'],
            ['Preparar apresentação semanal', 'Organizar os principais resultados da semana.', 'PENDENTE'],
            ['Atualizar lista de compras', 'Separar os itens essenciais para a semana.', 'PENDENTE'],
            ['Enviar resumo para a equipe', 'Compartilhar as decisões e os próximos passos.', 'CONCLUÍDA'],
            ['Organizar arquivos do computador', 'Mover documentos recentes para as pastas corretas.', 'PENDENTE'],
          ];
          samples.forEach((task) => insert.run(task));
          insert.finalize((insertError) => insertError ? reject(insertError) : resolve());
        });
      });
    });
  });
}

module.exports = { db, initializeDatabase };
