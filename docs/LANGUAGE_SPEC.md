# Especificação Formal da Linguagem Vox (v0.7.0)

**Vox** é uma linguagem de programação moderna, orientada a objetos, com tipagem gradual, gerenciamento de memória determinístico baseado em *ownership* (sem garbage collector obrigatório), concorrência CSP nativa e compilação para código de máquina através de C99.

---

## 1. Léxico e Sintaxe Básica

### 1.1 Identificadores e Palavras-chave
- Identificadores iniciam com letra (`a-z`, `A-Z`) ou underscore `_`, seguidos por letras, dígitos e underscores.
- **Palavras-chave Reservadas**:
  `class`, `interface`, `mixin`, `fn`, `let`, `const`, `pub`, `priv`, `prot`, `stat`, `new`, `self`, `super`, `if`, `elif`, `else`, `while`, `for`, `in`, `match`, `async`, `await`, `spawn`, `return`, `break`, `continue`, `own`, `borrow`, `ref`, `move`.

### 1.2 Comentários
- De linha única: `// comentário`
- De bloco (suporta aninhamento): `/* comentário em bloco */`

### 1.3 Literais
- **Inteiros**: `42`, `100LL`, `0xFF`, `0b1010`
- **Decimais**: `3.14159`, `0.5`, `1e-4`
- **Strings**: `"texto UTF-8\n"`, com suporte a sequências de escape (`\n`, `\t`, `\"`, `\\`)
- **Caracteres**: `'a'`, `'\n'`
- **Booleanos**: `true`, `false`
- **Nulo**: `null`

---

## 2. Sistema de Tipos

Vox combina tipagem estática expressiva com inferência local de tipos e suporte gradual:

### 2.1 Tipos Primitivos
- `int`: Inteiro de 64 bits com sinal (`int64_t`).
- `float`: Ponto flutuante IEEE 754 de precisão dupla (`double`).
- `bool`: Booleano de 1 byte (`true` ou `false`).
- `char`: Caractere único (código de 8 bits).
- `str`: String com comprimento explícito alocada na heap.
- `void`: Tipo unitário de funções sem retorno.

### 2.2 Tipos Monádicos e Coleções
- `Option<T>`: Representa valor opcional com variantes `some(val)` ou `none()`.
  - Métodos: `.unwrap()`, `.is_some()`, `.unwrap_or(default)`.
- `Result<T, E>`: Representa sucesso com `ok(val)` ou falha com `err(erro)`.
  - Métodos: `.unwrap()`, `.is_ok()`, `.is_err()`.
- `Array<T>`: Vetor contíguo redimensionável dinamicamente com `.push()`, `.pop()`, `.get()`, `.set()`, `.len`.
- `Channel<T>`: Canal bidirecional de mensagens concorrentes com buffer em anel thread-safe.

---

## 3. Programação Orientada a Objetos

### 3.1 Classes e Construtores
```vox
class Ponto {
    pub x: float;
    pub y: float;

    pub new(x: float, y: float) {
        self.x = x;
        self.y = y;
    }

    pub fn distancia_origem() -> float {
        return sqrt(self.x * self.x + self.y * self.y);
    }
}
```

### 3.2 Modificadores de Visibilidade
- `pub`: Membro público acessível de qualquer escopo.
- `priv`: Membro restrito à definição da própria classe.
- `prot`: Membro restrito à classe e subclasses derivadas.
- `stat`: Membro de escopo de classe (chamado via `Classe.membro`).

### 3.3 Herança e Polimorfismo
```vox
class Animal {
    pub nome: str;
    pub new(nome: str) { self.nome = nome; }
    pub fn falar() -> str { return "..."; }
}

class Cachorro : Animal {
    pub new(nome: str) {
        super.new(nome);
    }
    pub fn falar() -> str {
        return "Au au!";
    }
}
```

### 3.4 Sobrecarga de Operadores
As classes podem sobrecarregar operadores nativos:
- Aritméticos: `operator +`, `operator -`, `operator *`
- Comparação: `operator ==`, `operator !=`
- Indexação: `operator []`, `operator []=`

---

## 4. Ownership e Gerenciamento de Memória

Vox adota semântica afim de *ownership* estática com checagem opcional de *borrowing*:

1. **Propriedade Única**: Todo valor possui exatamente um dono (*owner*).
2. **Move Semantics**: Ao atribuir ou passar um valor de propriedade única, a posse é transferida. O uso subsequente da variável anterior resulta no erro em tempo de compilação `E0103 (use-after-move)`.
3. **Borrowing**:
   - Empréstimo compartilhado e imutável: `&valor` ou `borrow`.
   - Empréstimo exclusivo e mutável: `&mut valor`.
   - Não é permitido criar referências mutáveis concorrentes com referências ativas (`E0104`).

---

## 5. Programação Funcional & Pipeline

### 5.1 Lambdas
```vox
let duplicar = |x| => x * 2;
let somar = |a, b| { return a + b; };
```

### 5.2 Métodos de Alta Ordem
```vox
let numeros = [1, 2, 3, 4, 5];
let pares = numeros.filter(|x| => x % 2 == 0);
let dobro = numeros.map(|x| => x * 2);
let soma = numeros.reduce(|acc, x| => acc + x, 0);
```

### 5.3 Operador Pipeline (`|>`)
Permite composição linear da esquerda para a direita:
```vox
let resultado = 5 |> dobrar |> incrementar |> ao_quadrado;
```

---

## 6. Concorrência CSP (Communicating Sequential Processes)

Vox implementa concorrência segura por canais inspirada no cálculo CSP e em Go:

```vox
let ch = chan_new(4);

spawn {
    ch.send(42);
    ch.send(84);
    ch.close();
}

let v1 = ch.recv();
let v2 = ch.recv();
```

---

## 7. Pattern Matching

O `match` do Vox é uma expressão de valor exaustiva:
```vox
let status = match codigo {
    200 => "OK",
    400..499 => "Client Error",
    500..599 => "Server Error",
    _ => "Desconhecido"
};
```

Suporta desestruturação monádica:
```vox
let texto = match opcao {
    some(val) => "Valor: " + str(val),
    none => "Ausente"
};
```

---

## 8. Metaprogramação e Macros

### 8.1 Decoradores
- `@timed`: Mede o tempo de execução da função.
- `@logged`: Imprime chamadas e retornos.
- `@memoize`: Armazena retornos em cache para chamadas idênticas.

### 8.2 Macros
- `format!(template, ...args)`: Formatação com `{}`.
- `assert!(condicao, mensagem)`: Aborta execução sob falha.
- `dbg!(expressao)`: Inspeciona o valor e o retorna diretamente.
- `panic!(mensagem)`: Finaliza o programa com erro irrecuperável.

---

## 9. Compilação Nativa e Interoperabilidade C

O compilador do Vox transquila o código para ANSI C99 estruturado e invoca compiladores C de máquina:
- **TCC (Tiny C Compiler)**: Toolchain embutido ultra-rápido (~60ms).
- **GCC / Clang**: Geração com otimizações `-O2`.
- **MSVC**: Compilação x64 via `vcvars64.bat`.
