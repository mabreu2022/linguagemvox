# 🏛️ Arquitetura MVC — Sistema de Gestão de Clientes (Vox + SQLite)

Exemplo oficial da linguagem **Vox v1.0** demonstrando o padrão arquitetural **MVC (Model-View-Controller)** com persistência relacional nativa no **SQLite** (`clientes_vox.db`).

---

## 📂 Estrutura de Pastas e Componentes

```text
clientes/
├── db/
│   └── clientes_vox.db          # BANCO DE DADOS: Arquivo relacional SQLite
├── models/
│   └── cliente_model.vox        # MODEL: Entidade de Domínio e Acesso ao SQLite
├── views/
│   └── cliente_view.vox         # VIEW: Apresentação, Formatação e Relatórios
├── controllers/
│   └── cliente_controller.vox   # CONTROLLER: Mediação de Negócio e Fluxos
├── app.vox                      # PONTO DE ENTRADA: Execução e Injeção de Dependências
└── README.md                    # Documentação da Arquitetura
```

---

## 🧩 Responsabilidade de Cada Camada

### 1. 🗄️ Model (`models/cliente_model.vox`)
- **`Cliente`**: Modela a entidade com atributos fortemente tipados (`id: int`, `nome: str`, `email: str`, `telefone: str`, `cidade: str`, `saldo: float`).
- **`ClienteRepository`**: Encapsula todas as operações SQL no SQLite (`sqlite_open`, `sqlite_exec`, `sqlite_query`, `sqlite_close`), isolando o banco de dados do restante da aplicação.

### 2. 🖥️ View (`views/cliente_view.vox`)
- **`ClienteView`**: Totalmente desacoplada do banco de dados e de regras de negócio.
- Responsável por:
  - Formatar e desenhar tabelas no console.
  - Exibir fichas detalhadas de clientes.
  - Renderizar mensagens de sucesso, alerta e cabeçalhos visuais.

### 3. ⚙️ Controller (`controllers/cliente_controller.vox`)
- **`ClienteController`**: Orquestra o fluxo de dados entre o Model e a View.
- Responsável por:
  - Validar entradas e regras de negócio (ex: impedir nomes vazios).
  - Invocar métodos do repositório para persistir ou consultar dados.
  - Enviar os dados processados para a View apresentar ao usuário.

### 4. 🚀 App (`app.vox`)
- Utiliza a diretiva modular `include "..."` para carregar as camadas.
- Instancia o controlador com o arquivo do banco de dados e executa o ciclo de vida completo do CRUD.

---

## 💻 Como Executar

No terminal da raiz do projeto:

```powershell
node dist/cli/index.js run clientes/app.vox
```

Ou usando o atalho configurado no `package.json`:

```powershell
npm run crud:mvc
```

---

## 📊 Fluxo de Execução Demonstrado

1. **`iniciar()`**: Abre a conexão SQLite e inicializa a tabela `clientes`.
2. **`CREATE`**: Cadastra 4 clientes com dados realistas.
3. **`READ ALL`**: Renderiza relatório tabular com todos os clientes.
4. **`READ BY ID`**: Consulta individual exibindo a ficha completa do cliente #2.
5. **`UPDATE`**: Atualiza o telefone e saldo do cliente #1 para `R$ 3.500,00`.
6. **`DELETE`**: Remove o cliente #3 permanentemente.
7. **`READ ALL`**: Apresenta a listagem final consolidada demonstrando a integridade das operações.
8. **`finalizar()`**: Fecha a conexão do banco com segurança.
