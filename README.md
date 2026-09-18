# 🪐 Vox Programming Language (v1.0)

```
██╗   ██╗ ██████╗ ██╗  ██╗
██║   ██║██╔═══██╗╚██╗██╔╝
██║   ██║██║   ██║ ╚███╔╝ 
╚██╗ ██╔╝██║   ██║ ██╔██╗ 
 ╚████╔╝ ╚██████╔╝██╔╝ ██╗
  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝   v1.0 — Production-Ready
```

> **Vox** é uma linguagem de programação moderna, orientada a objetos e modular, com tipagem gradual, segurança de memória via *ownership & borrow checking* determinístico, concorrência CSP nativa, suporte embutido a **banco de dados SQLite** e **compilação direta para binários nativos de máquina (.exe)** via C99.

---

### 📚 Manuais e Documentação em HTML

- 📖 **[Manual Completo da Linguagem (HTML)](docs/index.html)**: Guia completo de sintaxe, OOP, traits, generics, ownership, concorrência e compilação nativa.
- ⚡ **[Manual Interativo de Comandos (HTML)](clientes/manual.html)**: Guia prático com botões de cópia para rodar o CRUD no terminal e na web.
- 🔌 **[Extensão Oficial para VS Code](https://marketplace.visualstudio.com/items?itemName=MauricioAbreu.voxlang-tools)**: Disponível no Visual Studio Marketplace (`mauricioabreu.voxlang-tools`).

---

## 🌟 Principais Recursos

- 💎 **Orientação a Objetos Moderna & Traits**: Classes com construtores explícitos (`new`), structs, traits com blocos `impl Trait for Struct`, modificadores de visibilidade (`pub`, `priv`, `prot`, `stat`) e sobrecarga de operadores (`+`, `-`, `*`, `==`, `!=`, `[]`, `[]=`).
- 🗄️ **Banco de Dados SQLite Nativo**: Funções embutidas de alta performance (`sqlite_open`, `sqlite_exec`, `sqlite_query`, `sqlite_close`) para criação de sistemas relacionais completos sem dependências externas.
- 📦 **Sistema Modular (`include`)**: Organização desacoplada de código através da diretiva `include "modulo.vox";`, permitindo arquiteturas corporativas como **MVC**.
- ⚡ **Compilação Nativa C99 Sub-Segundo**: Transpilação multi-pass para ANSI C99 e compilação direta para `.exe` nativo em ~60ms utilizando TCC embutido ou GCC/Clang/MSVC.
- 🦀 **Gerenciamento de Memória por Ownership**: Sem garbage collector obrigatório! Semântica afim (`own`, `borrow`, `ref`, `move`) e borrow checker com detecção de *use-after-move* e conflitos de empréstimo.
- 🔀 **Concorrência CSP (Canais & Goroutines)**: Corotinas leves (`spawn { ... }`) e canais bidirecionais (`chan_new`, `send`, `recv`, `close`) com buffers circulares seguros.
- 🧩 **Pattern Matching de Expressão de Valor**: `let x = match ...` com literais, ranges numéricos (`1..10`), monads (`some`, `none`, `ok`, `err`), tuplas e guards condicionais (`if`).
- 🌊 **Programação Funcional Fluida**: Lambdas compactas (`|x| => x * 2`), métodos de alta ordem (`.map()`, `.filter()`, `.reduce()`, `.find()`) e operador pipeline (`|>`).
- 🛠️ **Metaprogramação & Macros**: Decoradores `@timed`, `@logged`, `@memoize`, além de macros essenciais `format!`, `assert!`, `dbg!`, `panic!`.
- 🔍 **Diagnósticos Amigáveis**: Mensagens de erro estilo Rust/Elm com linhas numeradas, código contextualizado, squiggles (`^^^^^`) e sugestões automáticas.
- 🔌 **LSP & Extensão no Marketplace**: Servidor Language Server Protocol integrado (`vox lsp`) e extensão publicada no VS Code Marketplace com realce TextMate e snippets.

---

## 🚀 Instalação e Compilação

### Pré-requisitos
- Node.js (>= 18)
- NPM

```bash
# 1. Clonar o repositório
git clone git@github.com:mabreu2022/linguagemvox.git
cd linguagemvox

# 2. Instalar dependências
npm install

# 3. Compilar o compilador Vox
npm run build
```

---

## 🏛️ Sistema de Gestão de Clientes (Padrão MVC + SQLite)

O projeto inclui uma aplicação completa de cadastro de clientes desenvolvida no padrão **Model-View-Controller (MVC)** e conectada ao banco relacional SQLite:

```text
clientes/
├── db/
│   └── clientes_vox.db          # Base de dados relacional SQLite
├── models/
│   └── cliente_model.vox        # MODEL: Entidade Cliente e ClienteRepository
├── views/
│   └── cliente_view.vox         # VIEW: Relatórios e tabelas formatadas
├── controllers/
│   └── cliente_controller.vox   # CONTROLLER: Regras de negócio e mediação
├── app.vox                      # Ponto de entrada modular
├── manual.html                  # Manual interativo de comandos em HTML
└── README.md                    # Documentação técnica da arquitetura MVC
```

### 💻 Como Rodar o CRUD no Terminal (Console)

```powershell
# Executar via script NPM (Recomendado)
npm run crud:mvc

# Ou executar diretamente via CLI do compilador Vox
node dist/cli/index.js run clientes/app.vox
```

---

## 🌐 Como Rodar a Aplicação no Navegador Web (Dashboard Interativa)

Acompanha uma dashboard web moderna com tema escuro (*glassmorphism*), métricas em tempo real (KPIs), busca dinâmica instantânea, modais de cadastro/edição, exclusão segura e exportação de relatórios em CSV.

```powershell
# 1. Iniciar o servidor web
npm run crud:web

# 2. Acessar no seu navegador
http://localhost:3000

# (Opcional) Abrir diretamente pelo terminal no Windows
Start-Process "http://localhost:3000"
```

---

## 💻 Guia da Linha de Comando (CLI)

```bash
# Executar qualquer arquivo Vox no interpretador
node dist/cli/index.js run examples/crud_clientes_sqlite.vox

# Verificar tipos e sintaxe sem executar (Type-check)
node dist/cli/index.js check clientes/app.vox

# Compilar para binário nativo .exe e executar imediatamente
node dist/cli/index.js build examples/phase6_native.vox --run

# Compilar especificando nome do executável e emitindo o C intermediário
node dist/cli/index.js build examples/phase6_native.vox -o app.exe --emit-c

# Iniciar o Language Server Protocol (LSP) para editores
node dist/cli/index.js lsp

# Iniciar REPL interativo
node dist/cli/index.js repl
```

---

## 🔌 Extensão Oficial para Visual Studio Code

A extensão oficial **VoxLang** está publicada e disponível no catálogo mundial do Visual Studio Code:

- **Identificador na Loja:** `mauricioabreu.voxlang-tools`
- **Página do Marketplace:** [visualstudio.com/items?itemName=MauricioAbreu.voxlang-tools](https://marketplace.visualstudio.com/items?itemName=MauricioAbreu.voxlang-tools)

### Como instalar:
No VS Code, pressione `Ctrl+P` e cole:
```text
ext install MauricioAbreu.voxlang-tools
```
Ou instale o binário localmente via terminal:
```powershell
code --install-extension editors/vscode/voxlang-tools-1.0.0.vsix
```

---

## 📝 Exemplo de Código em Vox (CRUD + SQLite)

```vox
// 1. Conexão com banco SQLite
let db = sqlite_open("clientes/db/clientes_vox.db");

// 2. Criação de tabela DDL
sqlite_exec(db, "CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, saldo REAL);");

// 3. Inserção de dados (CREATE)
sqlite_exec(db, "INSERT INTO clientes (nome, saldo) VALUES ('Mauricio Abreu', 3500.00);");

// 4. Consulta relacional (READ)
let lista = sqlite_query(db, "SELECT id, nome, saldo FROM clientes;");
let mut i = 0;
while i < len(lista) {
    let row = lista[i];
    println("#" + str(row["id"]) + " | " + str(row["nome"]) + " | R$ " + str(row["saldo"]));
    i = i + 1;
}

// 5. Encerramento seguro
sqlite_close(db);
```

---

## 🧪 Testes Automatizados

Para executar toda a suíte de testes unitários e de integração do compilador:

```bash
npm test
```

---

## 🏗️ Estrutura do Repositório

```text
linguagem/
├── clientes/            # Sistema de Gestão de Clientes em padrão MVC
│   ├── db/              # Base de dados relacional SQLite (clientes_vox.db)
│   ├── models/          # Camada Model (Cliente + ClienteRepository)
│   ├── views/           # Camada View (Relatórios e Apresentação)
│   ├── controllers/     # Camada Controller (Regras de Negócio)
│   ├── app.vox          # Ponto de entrada da aplicação MVC
│   └── manual.html      # Manual interativo de comandos em HTML
├── tools/
│   ├── web/             # Servidor HTTP & Dashboard Web Interativa
│   └── tcc/             # Compilador Tiny C (TCC) embutido para Windows
├── editors/
│   └── vscode/          # Extensão oficial para VS Code (Marketplace)
├── docs/
│   ├── index.html       # Documentação completa da linguagem em HTML
│   ├── manual_clientes.html # Manual de comandos dos clientes
│   ├── LANGUAGE_SPEC.md # Especificação formal da gramática
│   └── TUTORIAL.md      # Guia introdutório
├── src/                 # Núcleo do compilador Vox (TypeScript)
│   ├── lexer/           # Tokenização
│   ├── parser/          # AST e parser recursivo
│   ├── semantic/        # Analisador semântico e sistema de tipos
│   ├── runtime/         # Interpretador nativo e built-ins SQLite
│   ├── codegen/         # Transpilação C99 e runtime em C (vox_runtime.h)
│   ├── diagnostics/     # Diagnósticos amigáveis com squiggles
│   ├── lsp/             # Language Server Protocol
│   └── cli/             # CLI unificada (run, build, check, repl)
├── examples/            # Exemplos práticos da linguagem
└── tests/               # Suíte de testes automatizados
```

---

## 📜 Licença

Distribuído sob a licença **MIT** © 2026 Mauricio Abreu.
