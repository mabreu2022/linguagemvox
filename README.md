# 🪐 Vox Programming Language (v0.7.0)

```
██╗   ██╗ ██████╗ ██╗  ██╗
██║   ██║██╔═══██╗╚██╗██╔╝
██║   ██║██║   ██║ ╚███╔╝ 
╚██╗ ██╔╝██║   ██║ ██╔██╗ 
 ╚████╔╝ ╚██████╔╝██╔╝ ██╗
  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝   v0.7.0 — Production-Ready
```

> **Vox** é uma linguagem de programação moderna, orientada a objetos, com tipagem gradual, segurança de memória via *ownership & borrow checking* determinístico, concorrência CSP nativa e **compilação direta para binários nativos de máquina (.exe)** via C99.

📖 **Documentação Completa**: Abra [`docs/index.html`](docs/index.html) no navegador para acessar o manual interativo completo com temas escuros, sintaxe, sistema de tipos, ownership, concorrência e guia de compilação.

---

## 🌟 Principais Recursos

- 💎 **Orientação a Objetos Moderna**: Classes com construtores explícitos (`new`), herança, interfaces, mixins, modificadores de visibilidade (`pub`, `priv`, `prot`, `stat`) e sobrecarga de operadores (`+`, `-`, `*`, `==`, `!=`, `[]`, `[]=`).
- ⚡ **Compilação Nativa C99 Sub-Segundo**: Transpilação multi-pass para ANSI C99 e compilação direta para `.exe` nativo em ~60ms utilizando TCC embutido ou GCC/Clang/MSVC.
- 🦀 **Gerenciamento de Memória por Ownership**: Sem garbage collector obrigatório! Semântica afim (`own`, `borrow`, `ref`, `move`) e borrow checker com detecção de *use-after-move* e conflitos de empréstimo.
- 🔀 **Concorrência CSP (Canais & Goroutines)**: Corotinas leves (`spawn { ... }`) e canais bidirecionais (`chan_new`, `send`, `recv`, `close`) com buffers circulares seguros.
- 🧩 **Pattern Matching de Expressão de Valor**: `let x = match ...` com literais, ranges numéricos (`1..10`), monads (`some`, `none`, `ok`, `err`), tuplas e guards condicionais (`if`).
- 🌊 **Programação Funcional Fluida**: Lambdas compactas (`|x| => x * 2`), métodos de alta ordem (`.map()`, `.filter()`, `.reduce()`, `.find()`, `.every()`, `.some()`) e operador pipeline (`|>`).
- 🛠️ **Metaprogramação & Macros**: Decoradores `@timed`, `@logged`, `@memoize`, além de macros essenciais `format!`, `assert!`, `dbg!`, `panic!`.
- 🔍 **Diagnósticos Amigáveis**: Mensagens de erro estilo Rust/Elm com linhas numeradas, código contextualizado, squiggles (`^^^^^`) e sugestões automáticas (*"Você quis dizer '...'?"*).
- 🔌 **LSP & Suporte a Editores**: Servidor Language Server Protocol integrado (`vox lsp`) com autocompletion, hover documentation e diagnostics, acompanhado de extensão VS Code com realce TextMate.

---

## 🚀 Instalação e Compilação

### Pré-requisitos
- Node.js (>= 18)
- NPM

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd linguagem

# 2. Instalar dependências
npm install

# 3. Compilar o compilador Vox
npm run build
```

---

## 💻 Guia da Linha de Comando (CLI)

```bash
# Executar código com o interpretador de alta performance
node dist/cli/index.js run examples/phase6_native.vox

# Compilar para binário nativo .exe e executar imediatamente
node dist/cli/index.js build examples/phase6_native.vox --run

# Compilar especificando nome do executável e emitindo o C intermediário
node dist/cli/index.js build examples/phase6_native.vox -o app.exe --emit-c

# Verificar tipos e sintaxe com mensagens de erro amigáveis
node dist/cli/index.js check examples/phase6_native.vox

# Iniciar o Language Server Protocol (LSP) para editores (VS Code, Neovim, etc.)
node dist/cli/index.js lsp

# Iniciar REPL interativo
node dist/cli/index.js repl
```

---

## 📝 Exemplo de Código em Vox

```vox
// 1. Definição de Classe Orientada a Objetos
class Personagem {
    pub nome: str;
    pub vida: int;

    pub new(nome: str, vida_inicial: int) {
        self.nome = nome;
        self.vida = vida_inicial;
    }

    pub fn receber_dano(dano: int) -> int {
        self.vida = self.vida - dano;
        if self.vida < 0 { self.vida = 0; }
        return self.vida;
    }

    pub fn esta_vivo() -> bool {
        return self.vida > 0;
    }
}

// 2. Concorrência CSP com Canais
let ch = chan_new(4);
ch.send(100);
ch.send(200);
let r1 = ch.recv();
let r2 = ch.recv();
ch.close();

// 3. Pattern Matching e Formatação
let heroi = new Personagem("Kaelen", 100);
heroi.receber_dano(35);

let status = match heroi.vida {
    100 => "Intacto",
    50..99 => "Ferido",
    1..49 => "Critico",
    _ => "Derrotado"
};

let msg = format!("Heroi: {} | Status: {} | Vida: {}", heroi.nome, status, heroi.vida);
println(msg);
assert!(heroi.esta_vivo(), "O heroi deve estar vivo!");
```

---

## 🧪 Testes Automatizados

O Vox conta com uma suite completa de testes automatizados cobrindo todas as fases de desenvolvimento:

```bash
npm test
```

```text
PASS tests/types_phase3.test.ts          (28 testes)
PASS tests/oop_phase2.test.ts            (19 testes)
PASS tests/interpreter.test.ts           (19 testes)
PASS tests/parser.test.ts                (14 testes)
PASS tests/lexer.test.ts                 (9 testes)
PASS tests/modern_features_phase5.test.ts (32 testes)
PASS tests/ownership_phase4.test.ts      (16 testes)
PASS tests/codegen_phase6.test.ts        (14 testes)

Test Suites: 8 passed, 8 total
Tests:       151 passed, 151 total (100% de sucesso)
```

---

## 🏗️ Estrutura do Projeto

```text
linguagem/
├── src/
│   ├── lexer/           # Tokenização e analisador léxico
│   ├── parser/          # Parser recursivo descendente e definições de AST
│   ├── semantic/        # Analisador semântico, tipos graduais e borrow checker
│   ├── runtime/         # Interpretador tree-walking com closures e goroutines
│   ├── codegen/         # Transpilador C99 (c_generator.ts) e runtime C (vox_runtime.h)
│   ├── diagnostics/     # Relatórios de erro amigáveis com squiggles e Levenshtein
│   ├── lsp/             # Servidor Language Server Protocol (hover, completion, symbols)
│   ├── cli/             # CLI unificada (run, build, check, lsp, repl)
│   └── index.ts         # Exportações públicas da biblioteca
├── editors/
│   └── vscode/          # Extensão VS Code oficial (TextMate grammar + config)
├── docs/
│   ├── LANGUAGE_SPEC.md # Especificação formal da linguagem
│   └── TUTORIAL.md      # Guia prático de aprendizado
├── examples/            # Códigos demonstrativos funcionais
├── tools/
│   └── tcc/             # Tiny C Compiler embutido para Windows x64
└── tests/               # Suites de testes automatizados
```

---

## 📚 Documentação Adicional

- [Especificação Formal da Linguagem (`docs/LANGUAGE_SPEC.md`)](file:///d:/Projetos%20AntiGravity/linguagem/docs/LANGUAGE_SPEC.md)
- [Tutorial Passo a Passo (`docs/TUTORIAL.md`)](file:///d:/Projetos%20AntiGravity/linguagem/docs/TUTORIAL.md)
- [Extensão VS Code (`editors/vscode/`)](file:///d:/Projetos%20AntiGravity/linguagem/editors/vscode)

---

## 📜 Licença
Distribuído sob licença MIT.
