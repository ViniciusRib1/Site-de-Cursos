const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const db = new sqlite3.Database("./usuarios.db", (err) => {
  if (err) {
    console.error("Erro ao abrir DB:", err.message);
  } else {
    console.log("Conectado ao banco SQLite.");

    db.run(
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        senha TEXT NOT NULL,
        foto TEXT NOT NULL,
        descricao TEXT
      )`,
      (err) => {
        if (err) {
          console.error("Erro ao criar tabela usuarios:", err.message);
        } else {
          db.all("PRAGMA table_info(usuarios);", (err, columns) => {
            if (err) {
              console.error("Erro ao checar colunas:", err.message);
              return;
            }

            const hasDescricao = columns.some(col => col.name === "descricao");

            if (!hasDescricao) {
              db.run("ALTER TABLE usuarios ADD COLUMN descricao TEXT", (err) => {
                if (err) {
                  console.error("Erro ao adicionar coluna descricao:", err.message);
                } else {
                  console.log("Coluna 'descricao' adicionada à tabela usuarios.");
                }
              });
            } else {
              console.log("Coluna 'descricao' já existe.");
            }
          });
        }
      }
    );
  }
});


app.get("/", (req, res) => {
  res.send("Servidor está funcionando!");
});

app.get("/api/usuarios", (req, res) => {
  const sql = "SELECT id, email, nome, foto, descricao FROM usuarios";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Erro ao buscar usuários: " + err.message });
    }
    res.json(rows);
  });
});

app.post("/api/usuarios", (req, res) => {
  const { email, nome, senha, foto, descricao } = req.body;

  if (!email || !nome || !senha || !foto) {
    return res.status(400).json({ error: "Por favor, preencha todos os campos obrigatórios." });
  }

  const sql = "INSERT INTO usuarios (email, nome, senha, foto, descricao) VALUES (?, ?, ?, ?, ?)";
  db.run(sql, [email, nome, senha, foto, descricao || ""], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(409).json({ error: "Email já cadastrado." });
      }
      return res.status(500).json({ error: "Erro ao salvar no banco: " + err.message });
    }
    res.status(201).json({ message: "Usuário registrado com sucesso!", id: this.lastID });
  });
});

app.delete("/api/usuarios", (req, res) => {
  const sql = "DELETE FROM usuarios";
  db.run(sql, function (err) {
    if (err) {
      return res.status(500).json({ error: "Erro ao deletar usuários: " + err.message });
    }
    res.json({ message: `Todos os usuários foram deletados com sucesso!` });
  });
});

app.post("/api/login", (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: "Preencha email e senha." });
  }

  const sql = "SELECT id, email, nome, foto, descricao FROM usuarios WHERE email = ? AND senha = ?";
  db.get(sql, [email, senha], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Erro no servidor: " + err.message });
    }
    if (!row) {
      return res.status(401).json({ error: "Email ou senha incorretos." });
    }
    res.json(row);
  });
});

app.put("/api/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const { nome, foto, descricao } = req.body;

  if (!nome || !foto) {
    return res.status(400).json({ error: "Nome e foto são obrigatórios." });
  }

  const sql = `UPDATE usuarios SET nome = ?, foto = ?, descricao = ? WHERE id = ?`;
  db.run(sql, [nome, foto, descricao, id], function (err) {
    if (err) {
      return res.status(500).json({ error: "Erro ao atualizar perfil: " + err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    res.json({ message: "Perfil atualizado com sucesso!" });
  });
});

process.on("exit", () => {
  db.close();
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
