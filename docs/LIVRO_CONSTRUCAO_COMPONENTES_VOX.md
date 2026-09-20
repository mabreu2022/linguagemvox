# 📘 Livro de Construção de Componentes Vox & Arquitetura de Pacotes (.vdpk)

> **Guia Definitivo de Desenvolvimento de Componentes Visuais e Não-Visuais para o Vox Studio RAD**  
> *Inspirado na arquitetura de componentes do Embarcadero Delphi / RAD Studio.*

---

## Sumário
1. [Capítulo 1: A Filosofia de Componentes no Vox e o Paralelo com a VCL do Delphi](#capítulo-1-a-filosofia-de-componentes-no-vox-e-o-paralelo-com-a-vcl-do-delphi)
2. [Capítulo 2: Anatomia de um Componente Vox](#capítulo-2-anatomia-de-um-componente-vox)
3. [Capítulo 3: Componentes Visuais vs. Componentes Não-Visuais](#capítulo-3-componentes-visuais-vs-componentes-não-visuais)
4. [Capítulo 4: A Extensão de Projetos de Pacotes (.vdpk — Vox Design Package)](#capítulo-4-a-extensão-de-projetos-de-pacotes-vdpk--vox-design-package)
5. [Capítulo 5: O Procedimento Oficial `Register()` e a Tool Palette](#capítulo-5-o-procedimento-oficial-register-e-a-tool-palette)
6. [Capítulo 6: Ciclo de Vida, Persistência e Streaming (.vxf / .dfm)](#capítulo-6-ciclo-de-vida-persistência-e-streaming-vxf--dfm)
7. [Capítulo 7: Construindo Controles Data-Aware (Acesso a Dados com vox_DataSource)](#capítulo-7-construindo-controles-data-aware-acesso-a-dados-com-vox_datasource)
8. [Capítulo 8: Projetos Práticos Passo a Passo: Criando o `vox_RatingStars` e `vox_KanbanBoard`](#capítulo-8-projetos-práticos-passo-a-passo-criando-o-vox_ratingstars-e-vox_kanbanboard)

---

## Capítulo 1: A Filosofia de Componentes no Vox e o Paralelo com a VCL do Delphi

No Delphi, a revolução do desenvolvimento rápido (RAD) começou com a **VCL (Visual Component Library)**, onde tudo herda de `TPersistent` e `TComponent`. Um componente é uma classe autossuficiente que:
- Pode ser instanciada dinamicamente pelo ambiente de design;
- Possui propriedades visíveis e editáveis no **Object Inspector**;
- Responde a eventos clicáveis e programáveis;
- Pode ser persistida em formato de streaming (arquivos `.dfm` no Delphi, `.vxf` no Vox);
- É empacotada em bibliotecas de design (`.dpk` no Delphi, `.vdpk` no Vox).

A linguagem Vox adota exatamente este paradigma de produtividade máxima, trazendo tipagem estática e compilação para sistemas Web modernos e nativos.

### Tabela de Correspondência Arquitetural

| Conceito Delphi | Equivalente na Linguagem Vox | Função |
|---|---|---|
| `TComponent` | `classe vox_Component` | Classe base para qualquer componente (visível ou não) |
| `TControl` / `TWinControl` | `classe vox_VisualControl` | Base para elementos que possuem renderização visual |
| `TGraphicControl` | `classe vox_GraphicControl` | Controle desenhado diretamente sem janela nativa pesada |
| `TDataModule` | `classe vox_DataModule` | Contêiner não-visual para conexões e datasets |
| Form Designer (`.dfm`) | Form Designer (`.vxf`) | Formato serializado de propriedades da interface |
| Código da Unit (`.pas`) | Código da Unit (`.vox`) | Implementação da lógica de negócio e eventos |
| Pacote de Design (`.dpk`) | Pacote de Design (`.vdpk`) | Arquivo de projeto que compila e registra componentes na IDE |
| `procedure Register;` | `procedimento Register()` | Ponto de entrada chamado pela IDE para instalar na Tool Palette |

---

## Capítulo 2: Anatomia de um Componente Vox

Um componente Vox é estruturado da seguinte forma:

```vox
classe vox_MeuComponente herda vox_Panel {
    // 1. Propriedades Públicas (Aparecem no Object Inspector)
    pub let mut Titulo: string;
    pub let mut ValorMaximo: i32;
    pub let mut CorDestaque: string;
    pub let mut Ativo: bool;

    // 2. Construtor e Inicializador
    procedimento Inicializar() {
        this.width = 160;
        this.height = 40;
        this.Titulo = "Meu Componente";
        this.ValorMaximo = 100;
        this.CorDestaque = "#0078d4";
        this.Ativo = true;
    }

    // 3. Métodos de Acesso (Getters / Setters com Re-renderização)
    procedimento SetTitulo(novoTitulo: string) {
        this.Titulo = novoTitulo;
        this.Invalidar(); // Solicita redesenho na IDE e no browser
    }

    // 4. Renderização do Componente
    procedimento Renderizar() -> string {
        return "<div class='vcl-meu-comp' style='color:" + this.CorDestaque + ";'>" + this.Titulo + "</div>";
    }
}
```

### Regras de Propriedades no Object Inspector
- Toda propriedade declarada como `pub let mut` é automaticamente inspecionada pela IDE;
- Tipos suportados nativamente: `string`, `i32`, `f64`, `bool`, `enum` e coleções delimitadas por vírgula;
- Propriedades com prefixo `On` (ex: `OnClick`, `OnChange`, `OnHover`) são tratadas automaticamente na aba **Events**.

---

## Capítulo 3: Componentes Visuais vs. Componentes Não-Visuais

Assim como no Delphi, o Vox RAD divide seus componentes em dois grandes grupos:

### 1. Componentes Visuais (Visual Controls)
Possuem dimensões geométricas (`left`, `top`, `width`, `height`), participam da árvore visual do formulário e são desenhados diretamente no canvas:
- Exemplos: `vox_Button`, `vox_Edit`, `vox_DBGrid`, `vox_MainMenu`, `vox_Card`, `vox_ProgressBar`.

### 2. Componentes Não-Visuais (Non-Visual Components)
São componentes que encapsulam serviços, lógica de infraestrutura ou conexões com bancos de dados. No formulário do designer, eles aparecem como um ícone representativo de 38x38 pixels com etiqueta, mas na execução web são invisíveis:
- Exemplos: `vox_Connection` (Conexão FireDAC style), `vox_Query` (Execução SQL), `vox_DataSource`, `vox_Timer`, `vox_OpenDialog`.

---

## Capítulo 4: A Extensão de Projetos de Pacotes (`.vdpk` — Vox Design Package)

No Delphi, múltiplos componentes são compilados juntos em um pacote com extensão `.dpk`.  
No Vox, introduzimos a extensão **`.vdpk`** (*Vox Design Package*).

### Estrutura de um Arquivo `.vdpk`

```vox
// Arquivo: MeusControles.vdpk
package MeusControles;

requires
    vox_rtl,
    vox_vcl,
    vox_designer;

contains
    vox_RatingStars in 'controls/vox_RatingStars.vox',
    vox_KanbanBoard in 'controls/vox_KanbanBoard.vox',
    vox_AvatarBadge in 'controls/vox_AvatarBadge.vox';

procedimento Register() {
    RegisterComponents("Vendas & Dashboards", [
        vox_RatingStars,
        vox_KanbanBoard,
        vox_AvatarBadge
    ]);
}
```

A IDE Vox Studio lê o arquivo `.vdpk`, valida a sintaxe, resolve as dependências do runtime e adiciona as novas abas ou itens na **Tool Palette** instantaneamente.

---

## Capítulo 5: O Procedimento Oficial `Register()` e a Tool Palette

No Delphi clássico:
```pascal
procedure Register;
begin
  RegisterComponents('Standard', [TMeuBotao, TMinhaGrade]);
end;
```

No Vox, mantemos exatamente a mesma semântica:
```vox
procedimento Register() {
    RegisterComponent("Custom Controls", vox_RatingStars, "⭐", {
        defaultWidth: 140,
        defaultHeight: 32,
        category: "Custom",
        description: "Controle de avaliação por estrelas interativo"
    });
}
```

Ao registrar, o componente ganha:
1. Um ícone na Tool Palette;
2. Comportamento de clique e arrasto (*Drag & Drop*) para o Designer;
3. Inclusão automática no Structure Tree e no Object Inspector.

---

## Capítulo 6: Ciclo de Vida, Persistência e Streaming (`.vxf` / `.dfm`)

Quando um formulário é salvo no Vox Studio:
1. O estado de cada componente é serializado em JSON e persistido no arquivo `.vxf` (*Vox Form Definition*);
2. A declaração e conexão de eventos são geradas em código Vox legível no arquivo `.vox`;
3. Ao carregar o formulário, a IDE lê o `.vxf`, instancia as classes de cada componente registrado e restaura todas as propriedades salvas.

---

## Capítulo 7: Construindo Controles Data-Aware (Acesso a Dados com `vox_DataSource`)

Para criar um controle sensível a dados (*Data-Aware*), o componente deve publicar a propriedade `DataSource`:

```vox
classe vox_DBBadge herda vox_Panel {
    pub let mut DataSource: string;
    pub let mut DataField: string;
    pub let mut StatusColor: string;

    procedimento Inicializar() {
        this.DataSource = "vox_DataSource1";
        this.DataField = "saldo";
        this.StatusColor = "#22c55e";
    }

    procedimento OnDataChange(valorAtual: string) {
        // Atualiza a exibição automaticamente quando o cursor do banco mudar de registro
        this.Invalidar();
    }
}
```

---

## Capítulo 8: Projetos Práticos Passo a Passo

### Exemplo: `vox_RatingStars`
```vox
classe vox_RatingStars herda vox_Panel {
    pub let mut Rating: f32;
    pub let mut StarsCount: i32;
    pub let mut ActiveColor: string;

    procedimento Inicializar() {
        this.width = 130;
        this.height = 30;
        this.Rating = 4.5;
        this.StarsCount = 5;
        this.ActiveColor = "#ffca28";
    }

    procedimento Renderizar() -> string {
        return "<div class='vcl-rating'>⭐⭐⭐⭐☆ (" + str(this.Rating) + ")</div>";
    }
}
```

Para instalar este componente no Vox Studio RAD:
1. Abra a IDE em `http://localhost:4500`;
2. Acesse o menu **`Component ➔ Instalar Pacote de Componentes (.vdpk)...`**;
3. Selecione o arquivo ou clique em **`Carregar Modelo de Exemplo`**;
4. Clique em **`🚀 Compilar e Instalar na Palette`**!
