const express = require('express');
const path = require('path');
const { db, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/tarefas', (_req, res) => {
  db.all('SELECT * FROM tarefas ORDER BY id DESC', [], (error, rows) => {
    if (error) return res.status(500).json({ erro: 'Não foi possível listar as tarefas.' });
    res.json(rows);
  });
});

app.post('/api/tarefas', (req, res) => {
  const titulo = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
  const descricao = typeof req.body.descricao === 'string' ? req.body.descricao.trim() : '';
  if (!titulo) return res.status(400).json({ erro: 'O título da tarefa é obrigatório.' });
  db.run('INSERT INTO tarefas (titulo, descricao) VALUES (?, ?)', [titulo, descricao], function (error) {
    if (error) return res.status(500).json({ erro: 'Não foi possível criar a tarefa.' });
    db.get('SELECT * FROM tarefas WHERE id = ?', [this.lastID], (readError, task) => {
      if (readError) return res.status(500).json({ erro: 'Tarefa criada, mas não foi possível carregá-la.' });
      res.status(201).json(task);
    });
  });
});

app.put('/api/tarefas/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ erro: 'Identificador inválido.' });
  db.get('SELECT status FROM tarefas WHERE id = ?', [id], (error, task) => {
    if (error) return res.status(500).json({ erro: 'Não foi possível atualizar a tarefa.' });
    if (!task) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    const status = task.status === 'PENDENTE' ? 'CONCLUÍDA' : 'PENDENTE';
    db.run('UPDATE tarefas SET status = ? WHERE id = ?', [status, id], function (updateError) {
      if (updateError) return res.status(500).json({ erro: 'Não foi possível atualizar a tarefa.' });
      db.get('SELECT * FROM tarefas WHERE id = ?', [id], (readError, updated) => {
        if (readError) return res.status(500).json({ erro: 'Tarefa atualizada, mas não foi possível carregá-la.' });
        res.json(updated);
      });
    });
  });
});

app.delete('/api/tarefas/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ erro: 'Identificador inválido.' });
  db.run('DELETE FROM tarefas WHERE id = ?', [id], function (error) {
    if (error) return res.status(500).json({ erro: 'Não foi possível excluir a tarefa.' });
    if (!this.changes) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    res.status(204).end();
  });
});

initializeDatabase().then(() => {
  app.listen(PORT, () => console.log(`Dashboard disponível em http://localhost:${PORT}`));
}).catch((error) => {
  console.error('Falha ao inicializar o banco de dados:', error);
  process.exit(1);
});
