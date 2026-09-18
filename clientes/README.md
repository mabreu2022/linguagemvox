# 🏛️ Arquitetura MVC Comercial — Clientes, Produtos, Estoque e PDV (Vox + SQLite)

Exemplo oficial da linguagem **Vox v1.0** demonstrando o padrão arquitetural **MVC (Model-View-Controller)** aplicado a um sistema de gestão comercial completo com persistência relacional nativa no **SQLite** (`clientes_vox.db`).

---

## 📂 Estrutura de Pastas e Módulos

```text
clientes/
├── db/
│   └── clientes_vox.db              # BANCO DE DADOS: Base relacional SQLite com 5 tabelas
├── models/
│   ├── cliente_model.vox            # MODEL: Entidade Cliente e ClienteRepository
│   ├── produto_model.vox            # MODEL: Entidade Produto e ProdutoRepository
│   ├── estoque_model.vox            # MODEL: Movimentações e Alertas de Estoque Mínimo
│   └── pdv_model.vox                # MODEL: Itens de Venda, Cabeçalho e PdvRepository
├── views/
│   ├── cliente_view.vox             # VIEW: Relatórios e Fichas de Clientes
│   ├── produto_view.vox             # VIEW: Catálogo de Produtos e Painel de Alertas
│   └── pdv_view.vox                 # VIEW: Cupom Fiscal Formatado e Checkout do Caixa
├── controllers/
│   ├── cliente_controller.vox       # CONTROLLER: Regras de Negócio de Clientes
│   ├── produto_controller.vox       # CONTROLLER: Gestão de Preços e Catálogo
│   ├── estoque_controller.vox       # CONTROLLER: Entradas e Auditoria de Estoque
│   └── pdv_controller.vox           # CONTROLLER: Carrinho, Desconto, Baixa e Checkout
├── app.vox                          # PONTO DE ENTRADA: Execução do Ciclo Comercial
├── manual.html                      # MANUAL INTERATIVO: Guia visual de execução
└── README.md                        # Documentação Técnica
```

---

## 🧩 Módulos e Responsabilidades das Camadas

### 1. 👥 Gestão de Clientes
- Cadastro completo (`nome`, `email`, `telefone`, `cidade`, `saldo`).
- Validação de e-mail e saldo.
- Listagem em formato tabular e consulta por ID.

### 2. 📦 Catálogo de Produtos
- Registro de mercadorias com código SKU único (ex: `PROD-001`), descrição, categoria, preço unitário e estoque mínimo.
- Controle de precificação e saldo em prateleira.

### 3. 📊 Controle de Estoque
- **Entradas de Mercadorias**: Atualização de saldo com histórico e motivo da compra.
- **Alertas Automáticos de Estoque Crítico**: Consulta SQL em tempo real que detecta itens com `estoque <= estoque_min` e emite alerta para o comprador.

### 4. 🛒 PDV (Ponto de Venda / Checkout)
- **Abertura de Cupom**: Vinculado a um cliente cadastrado.
- **Bipagem e Validação em Tempo Real**: Se o operador tentar vender quantidade superior ao saldo em estoque, o PDV recusa a operação e avisa a indisponibilidade.
- **Concessão de Desconto**: Abatimento promocional no valor do cupom.
- **Fechamento e Pagamento**: Cálculo de troco, gravação atômica da venda e dos itens, e **baixa automática no estoque físico** de cada produto vendido.
- **Emissão do Cupom Fiscal**: Apresentação visual limpa no console com itens discriminados, subtotais, dados da empresa, impostos simulados e troco.

---

## 💻 Como Executar

Execute o comando a partir da raiz do projeto:

```powershell
npm run crud:mvc
```

Ou diretamente pelo compilador Vox:

```powershell
node dist/cli/index.js run clientes/app.vox
```
