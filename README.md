# 🪐 Vox Programming Language (v1.1)

```
██╗   ██╗ ██████╗ ██╗  ██╗
██║   ██║██╔═══██╗╚██╗██╔╝
██║   ██║██║   ██║ ╚███╔╝ 
╚██╗ ██╔╝██║   ██║ ██╔██╗ 
 ╚████╔╝ ╚██████╔╝██╔╝ ██╗
  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝   v1.1 — Production-Ready
```

> **Vox** é uma linguagem de programação moderna, orientada a objetos e modular, com tipagem gradual, segurança de memória via *ownership & borrow checking* determinístico, concorrência CSP nativa, suporte a **threads reais preemptivas do SO**, **banco de dados SQLite**, **tratamento estruturado de exceções** e **compilação direta para binários nativos de máquina (.exe)** via C99.

---

### 📚 O Livro Oficial e Manuais em HTML

- 📘 **[O Livro Oficial da Linguagem Vox (The Vox Book)](docs/livro_vox.html)**: Livro completo do básico ao avançado em 21 capítulos com design editorial e suporte nativo a **exportação em PDF** (`npm run livro`).
- 📖 **[Documentação de Referência da Linguagem (HTML)](docs/index.html)**: Guia completo de sintaxe, OOP, traits, generics, ownership, concorrência e compilação nativa.
- ⚡ **[Manual Interativo de Comandos (HTML)](clientes/manual.html)**: Guia prático com botões de cópia para rodar o CRUD no terminal e na web.
- 🔌 **[Extensão Oficial para VS Code](https://marketplace.visualstudio.com/items?itemName=MauricioAbreu.voxlang-tools)**: Disponível no Visual Studio Marketplace (`mauricioabreu.voxlang-tools`).
- 🪐 **[Vox Studio RAD (IDE Visual Oficial)](https://github.com/mabreu2022/VOXIDERAD)**: Ambiente integrado visual Delphi-Like para criação de telas, componentes e relatórios.

---

## 📘 O Livro Oficial: A Linguagem de Programação Vox (Do Básico ao Avançado)

Construído nos mesmos moldes dos livros canônicos de outras linguagens consagradas (*The Rust Programming Language*, *Eloquent JavaScript*, *The Go Programming Language*), o **Livro Oficial da Linguagem Vox** oferece um percurso didático e aprofundado do nível iniciante ao nível sênior de engenharia de sistemas.

### O Que o Livro Cobre (21 Capítulos):
1. **Parte I — Fundamentos e Ambiente**: Filosofia, instalação, variáveis, imutabilidade por padrão (`let` vs `let mut`), sistema de tipos primitivos (`int`, `float`, `str`, `bool`, `char`, `void`, `any`), operadores (`??`, `?.`, `|>`), e controle de fluxo estruturado.
2. **Parte II — Procedimentos, Dados e Estruturação**: Funções, procedures com efeitos colaterais, lambdas, arrays, maps, tuplas, orientação a objetos moderna com `class` e construtor `new`, structs, traits, blocos `impl` e tipos genéricos (*Generics*).
3. **Parte III — Gestão de Memória e Concorrência**: Semântica de *Affine Ownership*, tempos de vida e o *Borrow Checker*, concorrência CSP com canais leves (`spawn`, `chan_new`), pattern matching com `match`, tratamento funcional de erros com `Option<T>` e `Result<T, E>` e programação assíncrona (`async`/`await`).
4. **Parte IV — Engenharia e Sistemas**: Decoradores (`@timed`, `@logged`), macros embutidas (`println!`, `dbg!`, `assert!`, `panic!`), banco relacional SQLite nativo, arquitetura corporativa **MVC**, compilação direta para C99 nativo e ferramentas de produtividade.
5. **Apêndices**: Tabela de precedência de operadores, catálogo completo de erros do compilador (E0101 a E0500) e guia de migração (de Rust, Go, Python, C e TypeScript).

### Como Ler e Exportar para PDF:
- **No Navegador**: Execute `npm run livro` ou abra [docs/livro_vox.html](docs/livro_vox.html). O livro possui sumário dinâmico, busca rápida, modo escuro/claro e botões de cópia de código.
- **Exportação em PDF**: Graças à folha de estilos editorial `@media print`, basta clicar no botão **"📄 Imprimir / Salvar PDF"** no topo da página ou pressionar `Ctrl + P` no navegador e selecionar "Salvar como PDF". O documento sairá diagramado no padrão A4 com margens de livro e quebras de capítulo limpas.

---

## 🚀 Novidades da Versão 1.1 (Recursos de Sistemas & Resiliência)

A versão **v1.1** expande a Vox para o desenvolvimento de sistemas completos, com suporte integrado a chamadas de SO, threads reais e bibliotecas utilitárias de ponta:

| Categoria | Recursos / Sintaxe | Descrição |
| :--- | :--- | :--- |
| **Exceções Estruturadas** | `try { ... } catch (e) { ... } finally { ... }`, `throw` | Controle de exceções de tempo de execução com `setjmp`/`longjmp` em C99 nativo. |
| **Propagação de Erros** | `expr?` | Desempacota `Option<T>` (`some`/`none`) e `Result<T, E>` (`ok`/`err`) com retorno antecipado. |
| **Threads Nativas & Mutex** | `thread_spawn`, `thread_join`, `thread_id`, `mutex_*` | Threads reais preemptivas (`CreateThread` / `pthread`) e exclusão mútua (`CRITICAL_SECTION`). |
| **Sistema de Arquivos** | `file_read`, `file_write`, `file_append`, `file_exists`, `file_delete`, `dir_*` | Leitura, escrita e gerenciamento completo de arquivos e diretórios no disco. |
| **Data, Hora & Sleep** | `time_now`, `time_millis`, `time_format`, `sleep(ms)` | Timestamps de alta resolução, formatação de datas e sleep real sem consumo de CPU. |
| **JSON Embutido** | `json_parse`, `json_stringify` | Serialização e desserialização direta entre JSON e estruturas Vox. |
| **Expressões Regulares** | `regex_test`, `regex_match`, `regex_replace` | Validação e manipulação avançada de textos com sintaxe Regex padrão. |
| **Coleção Set** | `set_new`, `set_add`, `set_has`, `set_delete`, `set_size`, `set_to_array` | Conjuntos dinâmicos com descarte automático de itens duplicados. |
| **Módulos Reais** | `import { a, b } from "modulo.vox"` | Importação seletiva com escopo de símbolos isolado e cache de módulos. |
| **Cliente HTTP** | `http_get`, `http_post` | Requisições HTTP síncronas nativas para consumo e integração de APIs. |

#### 💻 Exemplo Prático dos Novos Recursos:
```vox
// 1. Exceções e Propagação de Erro (?)
fn buscar_porta(config: str) -> Option<str> {
    if config == "server" { return some("8080"); }
    return none();
}

try {
    let porta = buscar_porta("server")?;
    println("Servidor ativo na porta: " + porta);
} catch (e) {
    println("Falha ao iniciar servidor: " + str(e));
}

// 2. Threads Reais em Paralelo
fn tarefa_paralela(id: int) -> int {
    return id * 10;
}
let t = thread_spawn(tarefa_paralela, 5);
println("Resultado da thread: " + str(thread_join(t))); // 50

// 3. Arquivos e JSON
file_write("info.json", json_stringify(set_to_array(set_new())));
```

> Execute a suíte de demonstração completa:
> ```bash
> node dist/cli/index.js run examples/novos_recursos_v1_1.vox
> ```

---

## 🌟 Principais Recursos

- 💎 **Orientação a Objetos Moderna & Traits**: Classes com construtores explícitos (`new`), structs, traits com blocos `impl Trait for Struct`, modificadores de visibilidade (`pub`, `priv`, `prot`, `stat`) e sobrecarga de operadores (`+`, `-`, `*`, `==`, `!=`, `[]`, `[]=`).
- 🧵 **Threads Reais & Concorrência CSP**: Concorrência híbrida combinando canais leves baseados em corotinas (`spawn`, `chan_new`) e threads preemptivas nativas do sistema operacional (`thread_spawn`, `mutex_new`).
- 🗄️ **Bancos de Dados Multi-Engine (SQLite, MySQL, SQL Server, Firebird)**: Interface universal (`db_connect`, `db_query`, `db_exec`, `db_close`) e funções nativas por driver (`sqlite_*`, `mysql_*`, `mssql_*`, `firebird_*`) para conectar a qualquer banco relacional com alto desempenho.
- 🔁 **Laços de Repetição e Controle de Fluxo**: Condicionais limpas (`if / elif / else`), laço `while` com suporte a loops contínuos e desvios (`break`, `continue`), e laço de iteração `for .. in` sobre coleções e intervalos numéricos (`1..10`).
- 📦 **Sistema Modular (`import` e `include`)**: Organização desacoplada de código através de `import { a } from "mod.vox"` com escopo isolado e `include "modulo.vox"`.
- ⚡ **Compilação Nativa C99 Sub-Segundo**: Transpilação multi-pass para ANSI C99 e compilação direta para `.exe` nativo em ~60ms utilizando TCC embutido ou GCC/Clang/MSVC.
- 🦀 **Gerenciamento de Memória por Ownership**: Sem garbage collector obrigatório! Semântica afim (`own`, `borrow`, `ref`, `move`) e borrow checker com detecção de *use-after-move* e conflitos de empréstimo.
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
