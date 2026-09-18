# Tutorial Prático: Aprendendo a Linguagem Vox

Bem-vindo ao tutorial da linguagem **Vox**! Este guia prático ensina passo a passo os conceitos essenciais da linguagem, desde o primeiro "Olá, Mundo" até concorrência com canais e compilação nativa.

---

## 1. Primeiros Passos

### 1.1 Executando com o Interpretador
Crie um arquivo chamado `hello.vox`:
```vox
println("Ola, Mundo! Bem-vindo ao Vox!");
```

Execute diretamente pelo interpretador:
```bash
vox run hello.vox
```

### 1.2 Compilando para Binário Nativo
Para compilar em um executável nativo do Windows (`.exe`):
```bash
vox build hello.vox --run
```
O Vox transquila o código para C99 intermediário e compila com o compilador embutido em menos de 100 milissegundos!

---

## 2. Variáveis e Tipos

```vox
// Declaração de variáveis locais
let nome: str = "Vox";
let versao: int = 7;
let ativo: bool = true;
let pi: float = 3.14159;

// Inferência local de tipos (opcional)
let cidade = "Sao Paulo";
let ano = 2026;

// Concatenação de strings
println("Linguagem: " + nome + " v" + int(versao));
```

---

## 3. Controle de Fluxo

### 3.1 Condicionais
```vox
let nota = 85;

if nota >= 90 {
    println("Excelente!");
} elif nota >= 70 {
    println("Aprovado.");
} else {
    println("Recuperacao.");
}
```

### 3.2 Loops (while e for)
```vox
let i = 0;
while i < 5 {
    print(int(i) + " ");
    i = i + 1;
}
println("");

let itens = ["Alpha", "Beta", "Gamma"];
for item in itens {
    println("Item: " + item);
}
```

---

## 4. Funções e Lambdas

```vox
fn somar(a: int, b: int) -> int {
    return a + b;
}

// Lambdas inline
let duplicar = |x| => x * 2;

// Programação funcional em coleções
let nums = [1, 2, 3, 4, 5];
let pares = nums.filter(|x| => x % 2 == 0);
let dobros = nums.map(|x| => x * 2);

// Operador Pipeline (|>)
let resultado = 10 |> duplicar;
```

---

## 5. Orientação a Objetos

Classes com construtores, campos com visibilidade e métodos:

```vox
class Personagem {
    pub nome: str;
    pub vida: int;

    pub new(nome: str, vida_inicial: int) {
        self.nome = nome;
        self.vida = vida_inicial;
    }

    pub fn receber_dano(dano: int) -> int {
        self.vida = self.vida - dano;
        if self.vida < 0 {
            self.vida = 0;
        }
        return self.vida;
    }

    pub fn esta_vivo() -> bool {
        return self.vida > 0;
    }
}

let heroi = new Personagem("Guerreiro", 100);
heroi.receber_dano(30);
println("Vida restante: " + int(heroi.vida));
```

---

## 6. Pattern Matching Exaustivo

```vox
let codigo = 404;

let msg = match codigo {
    200 => "Sucesso",
    400..499 => "Erro do Cliente",
    500..599 => "Erro do Servidor",
    _ => "Outro"
};

println("Status: " + msg);
```

---

## 7. Concorrência CSP (Goroutines e Canais)

Comunicação assíncrona segura sem bloqueios com trava manual:

```vox
let ch = chan_new(4);

// Envia dados
ch.send(100);
ch.send(200);

// Recebe dados
let a = ch.recv();
let b = ch.recv();
ch.close();

println("Valores recebidos: " + int(a) + ", " + int(b));
```

---

## 8. Macros e Metaprogramação

```vox
let jogador = "Alex";
let pontuacao = 1500;

// format! interpola variáveis dinamicamente
let resumo = format!("Jogador {} atingiu {} pontos!", jogador, pontuacao);
println(resumo);

// assert! valida invariantes do programa
assert!(pontuacao > 0, "Pontuacao deve ser positiva");

// dbg! inspeciona valores sem quebrar fluxo
let total = dbg!(pontuacao * 2);
```

---

## 9. Editores e Produtividade com LSP

O Vox inclui um servidor LSP oficial. Para conectar seu editor (VS Code, Neovim, etc.):

```bash
vox lsp
```

O servidor oferece diagnósticos em tempo real, autocomplete inteligente de símbolos e palavras-chave, e documentação rápida ao passar o cursor (*hover*).
