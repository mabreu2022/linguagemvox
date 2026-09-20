// ==============================================================================
// tools/vox-rad/public/js/templates.js — Modelos Visuais Prontos para Vox Studio RAD
// Padronizado com os componentes prefixo vox_*
// ==============================================================================

window.VOX_TEMPLATES = {
  // --------------------------------------------------------------------------
  // 0. ERP COMPLETO MVC (CLIENTES NF-E, PRODUTOS, ESTOQUE, PDV)
  // --------------------------------------------------------------------------
  erpCompleto: {
    name: 'FormERP',
    title: 'Vox ERP Comercial MVC - Gestão Fiscal, Estoque & PDV',
    width: 860,
    height: 620,
    components: [
      // Menu Principal no Topo
      {
        id: 'c_erp_menu',
        name: 'vox_MainMenu1',
        type: 'vox_MainMenu',
        left: 0, top: 0, width: 860, height: 38,
        props: { Layout: 'Top', Title: 'Vox ERP Enterprise (MVC)', Items: 'Cadastros, Fiscal (NF-e/NFC-e), Estoque, PDV Caixa, Financeiro, Configurações' }
      },
      // Conexão e DataSources
      {
        id: 'c_erp_conn',
        name: 'vox_Connection1',
        type: 'vox_Connection',
        left: 16, top: 46, width: 46, height: 46,
        props: { DriverName: 'PostgreSQL', Database: 'erp_vox_db', Host: '127.0.0.1', Port: 5432, Connected: true }
      },
      {
        id: 'c_erp_ds_cli',
        name: 'vox_DataSource1',
        type: 'vox_DataSource',
        left: 70, top: 46, width: 46, height: 46,
        props: { DataSet: 'vox_QueryClientes', AutoEdit: true }
      },
      {
        id: 'c_erp_ds_prod',
        name: 'vox_DataSource2',
        type: 'vox_DataSource',
        left: 124, top: 46, width: 46, height: 46,
        props: { DataSet: 'vox_QueryProdutos', AutoEdit: true }
      },
      // Navegador CRUD Responsivo (vox_DBNavigator) com largura 480px e 10 botões elásticos
      {
        id: 'c_erp_nav',
        name: 'vox_DBNavigator1',
        type: 'vox_DBNavigator',
        left: 154, top: 50, width: 480, height: 32,
        props: { DataSource: 'vox_DataSource1' }
      },
      // Botão Transmitir NF-e
      {
        id: 'c_erp_btn_nfe',
        name: 'vox_Button1',
        type: 'vox_Button',
        left: 646, top: 50, width: 196, height: 32,
        props: { Caption: '⚡ Emitir / Transmitir NF-e' },
        events: { OnClick: 'vox_Button1Click' }
      },
      // GroupBox 1: Cliente & Dados Fiscais SEFAZ (NF-e)
      {
        id: 'c_erp_gb_cli',
        name: 'vox_GroupBox1',
        type: 'vox_GroupBox',
        left: 16, top: 92, width: 826, height: 210,
        props: { Caption: ' 1. Destinatário da Nota Fiscal Eletrônica (SEFAZ NF-e 4.00) ' }
      },
      // Linha 1: Razão Social, Fantasia, CNPJ/CPF
      { id: 'c_lbl_rs', name: 'vox_Label1', type: 'vox_Label', left: 32, top: 118, width: 75, height: 18, props: { Caption: 'Razão Social:' } },
      { id: 'c_edt_rs', name: 'vox_DBEdit1', type: 'vox_DBEdit', left: 112, top: 114, width: 280, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'RazaoSocial' } },
      { id: 'c_lbl_fant', name: 'vox_Label2', type: 'vox_Label', left: 404, top: 118, width: 50, height: 18, props: { Caption: 'Fantasia:' } },
      { id: 'c_edt_fant', name: 'vox_DBEdit2', type: 'vox_DBEdit', left: 460, top: 114, width: 170, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'NomeFantasia' } },
      { id: 'c_lbl_cnpj', name: 'vox_Label3', type: 'vox_Label', left: 642, top: 118, width: 60, height: 18, props: { Caption: 'CPF/CNPJ:' } },
      { id: 'c_edt_cnpj', name: 'vox_DBEdit3', type: 'vox_DBEdit', left: 706, top: 114, width: 124, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'CnpjCpf' } },

      // Linha 2: Inscrição Estadual, IndIEDest, Email NF-e
      { id: 'c_lbl_ie', name: 'vox_Label4', type: 'vox_Label', left: 32, top: 154, width: 75, height: 18, props: { Caption: 'Inscr. Estadual:' } },
      { id: 'c_edt_ie', name: 'vox_DBEdit4', type: 'vox_DBEdit', left: 112, top: 150, width: 140, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'InscricaoEstadual' } },
      { id: 'c_lbl_indie', name: 'vox_Label5', type: 'vox_Label', left: 264, top: 154, width: 85, height: 18, props: { Caption: 'Ind. IE Dest:' } },
      { id: 'c_edt_indie', name: 'vox_DBEdit5', type: 'vox_DBEdit', left: 354, top: 150, width: 90, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'IndIEDest' } },
      { id: 'c_lbl_email', name: 'vox_Label6', type: 'vox_Label', left: 456, top: 154, width: 70, height: 18, props: { Caption: 'E-mail XML:' } },
      { id: 'c_edt_email', name: 'vox_DBEdit6', type: 'vox_DBEdit', left: 532, top: 150, width: 298, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'EmailNFe' } },

      // Linha 3: CEP, Logradouro, Número, Bairro, Mun. IBGE, UF
      { id: 'c_lbl_cep', name: 'vox_Label7', type: 'vox_Label', left: 32, top: 190, width: 35, height: 18, props: { Caption: 'CEP:' } },
      { id: 'c_edt_cep', name: 'vox_DBEdit7', type: 'vox_DBEdit', left: 72, top: 186, width: 80, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'CEP' } },
      { id: 'c_lbl_end', name: 'vox_Label8', type: 'vox_Label', left: 162, top: 190, width: 45, height: 18, props: { Caption: 'Logr:' } },
      { id: 'c_edt_end', name: 'vox_DBEdit8', type: 'vox_DBEdit', left: 210, top: 186, width: 210, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'Logradouro' } },
      { id: 'c_lbl_nro', name: 'vox_Label9', type: 'vox_Label', left: 430, top: 190, width: 25, height: 18, props: { Caption: 'Nº:' } },
      { id: 'c_edt_nro', name: 'vox_DBEdit9', type: 'vox_DBEdit', left: 460, top: 186, width: 60, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'Numero' } },
      { id: 'c_lbl_bairro', name: 'vox_Label10', type: 'vox_Label', left: 530, top: 190, width: 40, height: 18, props: { Caption: 'Bairro:' } },
      { id: 'c_edt_bairro', name: 'vox_DBEdit10', type: 'vox_DBEdit', left: 576, top: 186, width: 110, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'Bairro' } },
      { id: 'c_lbl_mun', name: 'vox_Label11', type: 'vox_Label', left: 696, top: 190, width: 30, height: 18, props: { Caption: 'IBGE:' } },
      { id: 'c_edt_mun', name: 'vox_DBEdit11', type: 'vox_DBEdit', left: 732, top: 186, width: 60, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'CodigoMunicipioIBGE' } },
      { id: 'c_edt_uf', name: 'vox_DBEdit12', type: 'vox_DBEdit', left: 800, top: 186, width: 30, height: 26, props: { DataSource: 'vox_DataSource1', DataField: 'UF' } },

      // GroupBox 2: Produtos, Tributação & Saldo em Estoque
      {
        id: 'c_erp_gb_prod',
        name: 'vox_GroupBox2',
        type: 'vox_GroupBox',
        left: 16, top: 312, width: 410, height: 190,
        props: { Caption: ' 2. Produto, Tributação Fiscal & Estoque ' }
      },
      { id: 'c_lbl_pdesc', name: 'vox_Label12', type: 'vox_Label', left: 30, top: 338, width: 65, height: 18, props: { Caption: 'Descrição:' } },
      { id: 'c_edt_pdesc', name: 'vox_DBEdit13', type: 'vox_DBEdit', left: 100, top: 334, width: 310, height: 26, props: { DataSource: 'vox_DataSource2', DataField: 'Descricao' } },
      { id: 'c_lbl_ncm', name: 'vox_Label13', type: 'vox_Label', left: 30, top: 374, width: 45, height: 18, props: { Caption: 'NCM:' } },
      { id: 'c_edt_ncm', name: 'vox_DBEdit14', type: 'vox_DBEdit', left: 80, top: 370, width: 90, height: 26, props: { DataSource: 'vox_DataSource2', DataField: 'NCM' } },
      { id: 'c_lbl_cfop', name: 'vox_Label14', type: 'vox_Label', left: 180, top: 374, width: 45, height: 18, props: { Caption: 'CFOP:' } },
      { id: 'c_edt_cfop', name: 'vox_DBEdit15', type: 'vox_DBEdit', left: 230, top: 370, width: 60, height: 26, props: { DataSource: 'vox_DataSource2', DataField: 'CFOP' } },
      { id: 'c_lbl_est', name: 'vox_Label15', type: 'vox_Label', left: 300, top: 374, width: 45, height: 18, props: { Caption: 'Saldo:' } },
      { id: 'c_edt_est', name: 'vox_DBEdit16', type: 'vox_DBEdit', left: 345, top: 370, width: 65, height: 26, props: { DataSource: 'vox_DataSource2', DataField: 'EstoqueAtual' } },
      { id: 'c_lbl_prvenda', name: 'vox_Label16', type: 'vox_Label', left: 30, top: 412, width: 75, height: 18, props: { Caption: 'Preço Venda:' } },
      { id: 'c_edt_prvenda', name: 'vox_DBEdit17', type: 'vox_DBEdit', left: 110, top: 408, width: 100, height: 26, props: { DataSource: 'vox_DataSource2', DataField: 'PrecoVenda' } },
      { id: 'c_btn_additem', name: 'vox_Button2', type: 'vox_Button', left: 220, top: 408, width: 190, height: 26, props: { Caption: '➕ Inserir no Carrinho PDV' }, events: { OnClick: 'vox_Button2Click' } },

      // GroupBox 3: PDV Frente de Caixa & Cupom Fiscal NFC-e
      {
        id: 'c_erp_gb_pdv',
        name: 'vox_GroupBox3',
        type: 'vox_GroupBox',
        left: 436, top: 312, width: 406, height: 190,
        props: { Caption: ' 3. Frente de Caixa (PDV) & Pagamento ' }
      },
      { id: 'c_lbl_tot', name: 'vox_Label17', type: 'vox_Label', left: 450, top: 338, width: 85, height: 18, props: { Caption: 'Total Cupom:' } },
      { id: 'c_edt_tot', name: 'vox_DBEdit18', type: 'vox_DBEdit', left: 540, top: 334, width: 130, height: 26, props: { DataSource: 'vox_DataSource2', DataField: 'TotalVenda' } },
      { id: 'c_lbl_pgto', name: 'vox_Label18', type: 'vox_Label', left: 450, top: 374, width: 80, height: 18, props: { Caption: 'Forma Pgto:' } },
      { id: 'c_edt_pgto', name: 'vox_DBEdit19', type: 'vox_DBEdit', left: 540, top: 370, width: 130, height: 26, props: { DataSource: 'vox_DataSource2', DataField: 'FormaPagamento' } },
      { id: 'c_btn_pix', name: 'vox_Button3', type: 'vox_Button', left: 680, top: 334, width: 145, height: 26, props: { Caption: '⚡ Pagar com PIX' }, events: { OnClick: 'vox_Button3Click' } },
      { id: 'c_btn_din', name: 'vox_Button4', type: 'vox_Button', left: 680, top: 370, width: 145, height: 26, props: { Caption: '💵 Dinheiro / Troco' }, events: { OnClick: 'vox_Button4Click' } },
      { id: 'c_btn_cupom', name: 'vox_Button5', type: 'vox_Button', left: 450, top: 412, width: 375, height: 32, props: { Caption: '🧾 Finalizar Venda & Imprimir Cupom Fiscal NFC-e' }, events: { OnClick: 'vox_Button5Click' } },

      // DBGrid no Rodapé: Itens e Movimentações
      {
        id: 'c_erp_grid',
        name: 'vox_DBGrid1',
        type: 'vox_DBGrid',
        left: 16, top: 512, width: 826, height: 95,
        props: { Columns: 'Código, Descrição do Produto, NCM, CFOP, Qtd, Preço Unit, Subtotal R$' }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 1. CADASTRO DE CLIENTES CRUD (DATA-AWARE COM SQLITE)
  // --------------------------------------------------------------------------
  crudClientes: {
    name: 'Form1',
    title: 'Form1',
    width: 680,
    height: 510,
    components: [
      // Menu Principal no Topo (vox_MainMenu)
      {
        id: 'comp_menu1',
        name: 'vox_MainMenu1',
        type: 'vox_MainMenu',
        left: 0, top: 0, width: 680, height: 38,
        props: { Layout: 'Top', Title: 'Sistema de Clientes', Items: 'Cadastros, Vendas, Relatórios, Configurações' }
      },
      // Conexão ao Banco SQLite (vox_Connection)
      {
        id: 'comp_conn1',
        name: 'vox_Connection1',
        type: 'vox_Connection',
        left: 16, top: 48, width: 38, height: 38,
        props: { DriverName: 'SQLite', Database: 'clientes_vox.db', Connected: true }
      },
      // Consulta SQL (vox_Query)
      {
        id: 'comp_qry1',
        name: 'vox_Query1',
        type: 'vox_Query',
        left: 60, top: 48, width: 38, height: 38,
        props: { Connection: 'vox_Connection1', SQL: 'SELECT id, nome, email, cidade, saldo FROM clientes', Active: true }
      },
      // DataSource que liga o Query aos Controles Visuais (vox_DataSource)
      {
        id: 'comp_ds1',
        name: 'vox_DataSource1',
        type: 'vox_DataSource',
        left: 104, top: 48, width: 38, height: 38,
        props: { DataSet: 'vox_Query1', AutoEdit: true }
      },
      // Navegador CRUD (vox_DBNavigator)
      {
        id: 'comp_nav1',
        name: 'vox_DBNavigator1',
        type: 'vox_DBNavigator',
        left: 160, top: 54, width: 240, height: 26,
        props: { DataSource: 'vox_DataSource1' }
      },
      // GroupBox de Dados (vox_GroupBox)
      {
        id: 'comp_gb1',
        name: 'vox_GroupBox1',
        type: 'vox_GroupBox',
        left: 16, top: 96, width: 645, height: 135,
        props: { Caption: ' Dados do Cliente ' }
      },
      // Nome
      {
        id: 'comp_lbl_nome',
        name: 'vox_Label1',
        type: 'vox_Label',
        left: 32, top: 122, width: 45, height: 18,
        props: { Caption: 'Nome:' }
      },
      {
        id: 'comp_edit_nome',
        name: 'vox_DBEdit1',
        type: 'vox_DBEdit',
        left: 80, top: 118, width: 240, height: 24,
        props: { DataSource: 'vox_DataSource1', DataField: 'nome' }
      },
      // Email
      {
        id: 'comp_lbl_email',
        name: 'vox_Label2',
        type: 'vox_Label',
        left: 340, top: 122, width: 45, height: 18,
        props: { Caption: 'E-mail:' }
      },
      {
        id: 'comp_edit_email',
        name: 'vox_DBEdit2',
        type: 'vox_DBEdit',
        left: 390, top: 118, width: 255, height: 24,
        props: { DataSource: 'vox_DataSource1', DataField: 'email' }
      },
      // Cidade
      {
        id: 'comp_lbl_cidade',
        name: 'vox_Label3',
        type: 'vox_Label',
        left: 32, top: 160, width: 45, height: 18,
        props: { Caption: 'Cidade:' }
      },
      {
        id: 'comp_edit_cidade',
        name: 'vox_DBEdit3',
        type: 'vox_DBEdit',
        left: 80, top: 156, width: 180, height: 24,
        props: { DataSource: 'vox_DataSource1', DataField: 'cidade' }
      },
      // Saldo
      {
        id: 'comp_lbl_saldo',
        name: 'vox_Label4',
        type: 'vox_Label',
        left: 280, top: 160, width: 45, height: 18,
        props: { Caption: 'Saldo:' }
      },
      {
        id: 'comp_edit_saldo',
        name: 'vox_DBEdit4',
        type: 'vox_DBEdit',
        left: 325, top: 156, width: 120, height: 24,
        props: { DataSource: 'vox_DataSource1', DataField: 'saldo' }
      },
      // Botão Salvar (vox_Button)
      {
        id: 'comp_btn_salvar',
        name: 'vox_Button1',
        type: 'vox_Button',
        left: 555, top: 155, width: 90, height: 26,
        props: { Caption: 'Salvar' },
        events: { OnClick: 'vox_Button1Click' }
      },
      // Grade de Dados (vox_DBGrid)
      {
        id: 'comp_grid1',
        name: 'vox_DBGrid1',
        type: 'vox_DBGrid',
        left: 16, top: 244, width: 645, height: 250,
        props: {
          DataSource: 'vox_DataSource1',
          Columns: 'ID, Nome, Cidade, Saldo'
        },
        events: { OnCellClick: 'vox_DBGrid1CellClick' }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. SISTEMA COM MENU LATERAL (SIDEBAR NAVIGATION)
  // --------------------------------------------------------------------------
  sistemaSidebar: {
    name: 'Form1',
    title: 'Sistema ERP — Menu Lateral',
    width: 720,
    height: 480,
    components: [
      // Menu Lateral à Esquerda (vox_MainMenu)
      {
        id: 'comp_side_menu',
        name: 'vox_MainMenu1',
        type: 'vox_MainMenu',
        left: 0, top: 0, width: 180, height: 480,
        props: {
          Layout: 'Left',
          Title: 'Meu ERP Vox',
          Items: 'Dashboard, Clientes, Vendas, Produtos, Relatórios, Ajustes'
        }
      },
      // Conexão ao Banco SQLite (vox_Connection)
      {
        id: 'comp_conn1',
        name: 'vox_Connection1',
        type: 'vox_Connection',
        left: 196, top: 12, width: 38, height: 38,
        props: { DriverName: 'SQLite', Database: 'clientes_vox.db', Connected: true }
      },
      // Consulta SQL (vox_Query)
      {
        id: 'comp_qry1',
        name: 'vox_Query1',
        type: 'vox_Query',
        left: 242, top: 12, width: 38, height: 38,
        props: { Connection: 'vox_Connection1', SQL: 'SELECT id, nome, email, cidade, saldo FROM clientes', Active: true }
      },
      // DataSource (vox_DataSource)
      {
        id: 'comp_ds1',
        name: 'vox_DataSource1',
        type: 'vox_DataSource',
        left: 288, top: 12, width: 38, height: 38,
        props: { DataSet: 'vox_Query1', AutoEdit: true }
      },
      // Navegador CRUD (vox_DBNavigator)
      {
        id: 'comp_nav1',
        name: 'vox_DBNavigator1',
        type: 'vox_DBNavigator',
        left: 345, top: 18, width: 230, height: 26,
        props: { DataSource: 'vox_DataSource1' }
      },
      // Grade de Dados no espaço livre à direita da sidebar
      {
        id: 'comp_grid1',
        name: 'vox_DBGrid1',
        type: 'vox_DBGrid',
        left: 196, top: 60, width: 508, height: 405,
        props: {
          DataSource: 'vox_DataSource1',
          Columns: 'ID, Nome, Cidade, Saldo'
        }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 2. FRENTE DE CAIXA (PDV)
  // --------------------------------------------------------------------------
  pdv: {
    name: 'Form1',
    title: 'PDV - Ponto de Venda',
    width: 660,
    height: 460,
    components: [
      {
        id: 'c_lbl_sku',
        name: 'vox_Label1',
        type: 'vox_Label',
        left: 20, top: 20, width: 100, height: 18,
        props: { Caption: 'Código do Item:' }
      },
      {
        id: 'c_edit_sku',
        name: 'vox_Edit1',
        type: 'vox_Edit',
        left: 20, top: 42, width: 280, height: 24,
        props: { Text: '' }
      },
      {
        id: 'c_btn_add',
        name: 'vox_Button1',
        type: 'vox_Button',
        left: 20, top: 78, width: 130, height: 28,
        props: { Caption: 'Adicionar Item' },
        events: { OnClick: 'vox_Button1Click' }
      },
      {
        id: 'c_btn_fin',
        name: 'vox_Button2',
        type: 'vox_Button',
        left: 160, top: 78, width: 140, height: 28,
        props: { Caption: 'Finalizar Venda' },
        events: { OnClick: 'vox_Button2Click' }
      },
      {
        id: 'c_grid_itens',
        name: 'vox_DBGrid1',
        type: 'vox_DBGrid',
        left: 320, top: 20, width: 320, height: 410,
        props: { Columns: 'Item, Qtd, Valor, Total' }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 3. CALCULADORA RAD
  // --------------------------------------------------------------------------
  calculadora: {
    name: 'Form1',
    title: 'Calculadora',
    width: 320,
    height: 380,
    components: [
      {
        id: 'c_calc_display',
        name: 'vox_Edit1',
        type: 'vox_Edit',
        left: 16, top: 16, width: 284, height: 32,
        props: { Text: '0' }
      },
      // Linha 1: 7, 8, 9, /
      { id: 'c_btn7', name: 'vox_Button1', type: 'vox_Button', left: 16, top: 60, width: 65, height: 40, props: { Caption: '7' } },
      { id: 'c_btn8', name: 'vox_Button2', type: 'vox_Button', left: 88, top: 60, width: 65, height: 40, props: { Caption: '8' } },
      { id: 'c_btn9', name: 'vox_Button3', type: 'vox_Button', left: 160, top: 60, width: 65, height: 40, props: { Caption: '9' } },
      { id: 'c_btnDiv', name: 'vox_Button4', type: 'vox_Button', left: 232, top: 60, width: 68, height: 40, props: { Caption: '/' } },

      // Linha 2: 4, 5, 6, *
      { id: 'c_btn4', name: 'vox_Button5', type: 'vox_Button', left: 16, top: 110, width: 65, height: 40, props: { Caption: '4' } },
      { id: 'c_btn5', name: 'vox_Button6', type: 'vox_Button', left: 88, top: 110, width: 65, height: 40, props: { Caption: '5' } },
      { id: 'c_btn6', name: 'vox_Button7', type: 'vox_Button', left: 160, top: 110, width: 65, height: 40, props: { Caption: '6' } },
      { id: 'c_btnMul', name: 'vox_Button8', type: 'vox_Button', left: 232, top: 110, width: 68, height: 40, props: { Caption: '*' } },

      // Linha 3: 1, 2, 3, -
      { id: 'c_btn1', name: 'vox_Button9', type: 'vox_Button', left: 16, top: 160, width: 65, height: 40, props: { Caption: '1' } },
      { id: 'c_btn2', name: 'vox_Button10', type: 'vox_Button', left: 88, top: 160, width: 65, height: 40, props: { Caption: '2' } },
      { id: 'c_btn3', name: 'vox_Button11', type: 'vox_Button', left: 160, top: 160, width: 65, height: 40, props: { Caption: '3' } },
      { id: 'c_btnSub', name: 'vox_Button12', type: 'vox_Button', left: 232, top: 160, width: 68, height: 40, props: { Caption: '-' } },

      // Linha 4: 0, C, =, +
      { id: 'c_btn0', name: 'vox_Button13', type: 'vox_Button', left: 16, top: 210, width: 65, height: 40, props: { Caption: '0' } },
      { id: 'c_btnC', name: 'vox_Button14', type: 'vox_Button', left: 88, top: 210, width: 65, height: 40, props: { Caption: 'C' } },
      { id: 'c_btnIgual', name: 'vox_Button15', type: 'vox_Button', left: 160, top: 210, width: 65, height: 40, props: { Caption: '=' } },
      { id: 'c_btnSom', name: 'vox_Button16', type: 'vox_Button', left: 232, top: 210, width: 68, height: 40, props: { Caption: '+' } }
    ]
  },

  // --------------------------------------------------------------------------
  // 4. LAÇOS DE REPETIÇÃO NO BANCO DE DADOS (WHILE & FOR..IN)
  // --------------------------------------------------------------------------
  lacosBancoDados: {
    name: 'FormLacosBanco',
    title: 'Laços de Repetição com Banco de Dados (While & For..in)',
    width: 820,
    height: 560,
    components: [
      // Conexão e Dataset
      {
        id: 'c_lacos_conn',
        name: 'vox_Connection1',
        type: 'vox_Connection',
        left: 16, top: 12, width: 46, height: 46,
        props: { DriverName: 'SQLite', Database: 'clientes_vox.db', Connected: true }
      },
      {
        id: 'c_lacos_query',
        name: 'vox_Query1',
        type: 'vox_Query',
        left: 70, top: 12, width: 46, height: 46,
        props: { Connection: 'vox_Connection1', SQL: 'SELECT id, nome, cidade, saldo FROM clientes ORDER BY id ASC;', Active: true }
      },
      {
        id: 'c_lacos_ds',
        name: 'vox_DataSource1',
        type: 'vox_DataSource',
        left: 124, top: 12, width: 46, height: 46,
        props: { DataSet: 'vox_Query1' }
      },

      // GroupBox de Controles dos Laços
      {
        id: 'c_lacos_gb_ops',
        name: 'vox_GroupBox1',
        type: 'vox_GroupBox',
        left: 16, top: 62, width: 788, height: 85,
        props: { Caption: ' Escolha a Estrutura de Laço para Executar no Banco de Dados ' }
      },
      {
        id: 'c_btn_while_eof',
        name: 'btnWhileEof',
        type: 'vox_Button',
        left: 32, top: 92, width: 175, height: 38,
        props: { Caption: '▶ Laço While (!Query.Eof)' },
        events: { OnClick: 'btnWhileEofClick' },
        eventBodies: {
          OnClick: `        // 1. LAÇO WHILE COM CURSOR DATASET (ESTILO DELPHI)
        this.memoLog.lines.add("═════════════════════════════════════════════════");
        this.memoLog.lines.add("▶ INICIANDO: While !Query.eof() com Avanço .next()");
        this.memoLog.lines.add("═════════════════════════════════════════════════");

        this.vox_Query1.sql = "SELECT id, nome, cidade, saldo FROM clientes ORDER BY id ASC;";
        this.vox_Query1.open();

        let mut totalLidos: int = 0;
        let mut somaTotal: float = 0.0;

        // Laço While clássico: itera registro por registro até o fim da tabela
        while !this.vox_Query1.eof() {
            totalLidos = totalLidos + 1;
            let id = this.vox_Query1.fieldByName("id").asInt();
            let nome = this.vox_Query1.fieldByName("nome").asString();
            let cidade = this.vox_Query1.fieldByName("cidade").asString();
            let saldo = this.vox_Query1.fieldByName("saldo").asFloat();

            somaTotal = somaTotal + saldo;

            this.memoLog.lines.add("[" + str(totalLidos) + "] ID: " + str(id) + " | " + nome + " (" + cidade + ") | Saldo: R$ " + str(saldo));

            // Avança o ponteiro do cursor para o próximo registro
            this.vox_Query1.next();
        }

        this.vox_Query1.close();
        this.memoLog.lines.add("✔️ Fim do laço While: " + str(totalLidos) + " registros lidos.");
        this.memoLog.lines.add("💰 Total acumulado: R$ " + str(somaTotal) + "\\n");`
        }
      },
      {
        id: 'c_btn_for_in',
        name: 'btnForIn',
        type: 'vox_Button',
        left: 215, top: 92, width: 185, height: 38,
        props: { Caption: '⚡ Laço For..in (Array Records)' },
        events: { OnClick: 'btnForInClick' },
        eventBodies: {
          OnClick: `        // 2. LAÇO FOR..IN COM CONSULTA RETORNANDO ARRAY DE REGISTROS
        this.memoLog.lines.add("═════════════════════════════════════════════════");
        this.memoLog.lines.add("⚡ INICIANDO: For cliente in Array de Registros");
        this.memoLog.lines.add("═════════════════════════════════════════════════");

        // Executa a consulta e recebe diretamente uma lista iterável
        let registros = sqlite_query(this.vox_Connection1.handle, "SELECT id, nome, cidade, saldo FROM clientes WHERE saldo > 0;");

        // Laço For..in nativo do Vox
        for cliente in registros {
            let nome = str(cliente["nome"]);
            let saldo = float(cliente["saldo"]);

            if saldo >= 10000.0 {
                this.memoLog.lines.add("💎 CLIENTE VIP: " + nome + " -> Saldo: R$ " + str(saldo));
            } else {
                this.memoLog.lines.add("👤 CLIENTE REGULAR: " + nome + " -> Saldo: R$ " + str(saldo));
            }
        }

        this.memoLog.lines.add("✔️ Fim do laço For..in: " + str(len(registros)) + " registros processados!\\n");`
        }
      },
      {
        id: 'c_btn_break_cont',
        name: 'btnBreakContinue',
        type: 'vox_Button',
        left: 408, top: 92, width: 195, height: 38,
        props: { Caption: '🛑 Laço com Break e Continue' },
        events: { OnClick: 'btnBreakContinueClick' },
        eventBodies: {
          OnClick: `        // 3. LAÇO COM CONTROLE DE FLUXO (BREAK E CONTINUE)
        this.memoLog.lines.add("═════════════════════════════════════════════════");
        this.memoLog.lines.add("🛑 INICIANDO: Laço com Controle de Fluxo");
        this.memoLog.lines.add("═════════════════════════════════════════════════");

        let clientes = sqlite_query(this.vox_Connection1.handle, "SELECT id, nome, saldo FROM clientes;");

        for cli in clientes {
            let saldo = float(cli["saldo"]);
            let nome = str(cli["nome"]);

            // 'continue': pula clientes com saldo menor ou igual a 1.000
            if saldo <= 1000.0 {
                this.memoLog.lines.add("⏭️ [CONTINUE] Ignorando " + nome + " (saldo baixo: R$ " + str(saldo) + ")");
                continue;
            }

            // 'break': interrompe imediatamente ao encontrar saldo extraordinário (> 30.000)
            if saldo >= 30000.0 {
                this.memoLog.lines.add("🛑 [BREAK] Interrompendo laço! Localizado cliente com saldo > 30k: " + nome);
                break;
            }

            this.memoLog.lines.add("✔️ Registro aceito: " + nome + " (R$ " + str(saldo) + ")");
        }
        this.memoLog.lines.add("─────────────────────────────────────────────\\n");`
        }
      },
      {
        id: 'c_btn_clear_log',
        name: 'btnClearLog',
        type: 'vox_Button',
        left: 611, top: 92, width: 175, height: 38,
        props: { Caption: '🧹 Limpar Console / Log' },
        events: { OnClick: 'btnClearLogClick' },
        eventBodies: {
          OnClick: `        this.memoLog.lines.clear();
        this.memoLog.lines.add("Console limpo. Selecione um dos laços acima para executar.");`
        }
      },

      // Lado Esquerdo: DBGrid exibindo a tabela
      {
        id: 'c_lbl_grid',
        name: 'vox_Label1',
        type: 'vox_Label',
        left: 16, top: 156, width: 250, height: 18,
        props: { Caption: '📊 Registros na Tabela SQLite (DBGrid):', FontBold: true }
      },
      {
        id: 'c_lacos_grid',
        name: 'vox_DBGrid1',
        type: 'vox_DBGrid',
        left: 16, top: 178, width: 380, height: 360,
        props: { DataSource: 'vox_DataSource1', Columns: 'ID, Nome, Cidade, Saldo' }
      },

      // Lado Direito: Memo com o console de saída dos laços
      {
        id: 'c_lbl_memo',
        name: 'vox_Label2',
        type: 'vox_Label',
        left: 412, top: 156, width: 250, height: 18,
        props: { Caption: '💻 Saída da Execução dos Laços (Memo):', FontBold: true }
      },
      {
        id: 'c_lacos_memo',
        name: 'memoLog',
        type: 'vox_Memo',
        left: 412, top: 178, width: 392, height: 360,
        props: {
          Text: '=== DEMONSTRAÇÃO DE LAÇOS (WHILE / FOR..IN) NO BANCO DE DADOS ===\\nClique em um dos botões acima para executar os laços passo a passo...'
        }
      }
    ]
  },

  // --------------------------------------------------------------------------
  // 5. RELATÓRIO DE VENDAS COM FAIXAS (DELPHI HTML / EXPORTAÇÃO PDF)
  // --------------------------------------------------------------------------
  relatorioVendas: {
    name: 'FormRelatorioVendas',
    title: 'Relatório Gerencial de Vendas (Delphi QuickReport HTML/PDF)',
    width: 760,
    height: 580,
    components: [
      {
        id: 'rep_vendas',
        name: 'ReportVendas',
        type: 'vox_Report',
        left: 20, top: 20, width: 720, height: 530,
        props: {
          ReportTitle: 'RELATÓRIO GERENCIAL DE VENDAS',
          PageOrientation: 'poPortrait',
          PageSize: 'psA4',
          MarginLeft: 10, MarginRight: 10, MarginTop: 15, MarginBottom: 15,
          DataSource: 'vox_DataSource1'
        }
      },
      {
        id: 'b_title',
        name: 'TitleBand1',
        type: 'vox_ReportBand',
        parent: 'ReportVendas',
        left: 10, top: 36, width: 700, height: 50,
        props: { BandType: 'rbTitle', Height: 50, Color: '#f8fafc', BorderBottom: true }
      },
      {
        id: 'lbl_title',
        name: 'lblMainTitle',
        type: 'vox_ReportLabel',
        parent: 'TitleBand1',
        left: 15, top: 10, width: 450, height: 28,
        props: { Caption: 'EMPRESA EXEMPLO S/A — RELATÓRIO DE VENDAS', FontSize: 13, FontBold: true, FontColor: '#0284c7' }
      },
      {
        id: 'b_header',
        name: 'HeaderBand1',
        type: 'vox_ReportBand',
        parent: 'ReportVendas',
        left: 10, top: 92, width: 700, height: 32,
        props: { BandType: 'rbPageHeader', Height: 32, Color: '#e2e8f0', BorderBottom: true }
      },
      {
        id: 'h_cod',
        name: 'lblH_Cod',
        type: 'vox_ReportLabel',
        parent: 'HeaderBand1',
        left: 15, top: 6, width: 80, height: 20,
        props: { Caption: 'CÓDIGO', FontBold: true, FontSize: 9, FontColor: '#334155' }
      },
      {
        id: 'h_nome',
        name: 'lblH_Nome',
        type: 'vox_ReportLabel',
        parent: 'HeaderBand1',
        left: 105, top: 6, width: 230, height: 20,
        props: { Caption: 'NOME DO CLIENTE', FontBold: true, FontSize: 9, FontColor: '#334155' }
      },
      {
        id: 'h_cid',
        name: 'lblH_Cid',
        type: 'vox_ReportLabel',
        parent: 'HeaderBand1',
        left: 345, top: 6, width: 140, height: 20,
        props: { Caption: 'CIDADE / UF', FontBold: true, FontSize: 9, FontColor: '#334155' }
      },
      {
        id: 'h_valor',
        name: 'lblH_Valor',
        type: 'vox_ReportLabel',
        parent: 'HeaderBand1',
        left: 495, top: 6, width: 140, height: 20,
        props: { Caption: 'SALDO ATUAL', FontBold: true, FontSize: 9, FontColor: '#334155', Alignment: 'taRightJustify' }
      },
      {
        id: 'b_detail',
        name: 'DetailBand1',
        type: 'vox_ReportBand',
        parent: 'ReportVendas',
        left: 10, top: 130, width: 700, height: 32,
        props: { BandType: 'rbDetail', Height: 32, Color: '#ffffff', BorderBottom: true }
      },
      {
        id: 'd_cod',
        name: 'dbCod',
        type: 'vox_ReportDBText',
        parent: 'DetailBand1',
        left: 15, top: 6, width: 80, height: 20,
        props: { DataField: 'codigo', Alignment: 'taLeftJustify' }
      },
      {
        id: 'd_nome',
        name: 'dbNome',
        type: 'vox_ReportDBText',
        parent: 'DetailBand1',
        left: 105, top: 6, width: 230, height: 20,
        props: { DataField: 'nome', Alignment: 'taLeftJustify' }
      },
      {
        id: 'd_cid',
        name: 'dbCid',
        type: 'vox_ReportDBText',
        parent: 'DetailBand1',
        left: 345, top: 6, width: 140, height: 20,
        props: { DataField: 'cidade', Alignment: 'taLeftJustify' }
      },
      {
        id: 'd_saldo',
        name: 'dbSaldo',
        type: 'vox_ReportDBText',
        parent: 'DetailBand1',
        left: 495, top: 6, width: 140, height: 20,
        props: { DataField: 'saldo', DisplayFormat: 'Currency (R$ #,##0.00)', Alignment: 'taRightJustify' }
      },
      {
        id: 'b_summary',
        name: 'SummaryBand1',
        type: 'vox_ReportBand',
        parent: 'ReportVendas',
        left: 10, top: 168, width: 700, height: 40,
        props: { BandType: 'rbSummary', Height: 40, Color: '#f1f5f9', BorderBottom: true }
      },
      {
        id: 'lbl_tot',
        name: 'lblTotalGeral',
        type: 'vox_ReportLabel',
        parent: 'SummaryBand1',
        left: 320, top: 10, width: 160, height: 20,
        props: { Caption: 'TOTAL ACUMULADO:', FontBold: true, FontColor: '#1e293b', Alignment: 'taRightJustify' }
      },
      {
        id: 'db_tot',
        name: 'dbTotalSaldo',
        type: 'vox_ReportDBText',
        parent: 'SummaryBand1',
        left: 495, top: 10, width: 140, height: 20,
        props: { DataField: 'saldo', DisplayFormat: 'Currency (R$ #,##0.00)', FontBold: true, FontColor: '#047857', Alignment: 'taRightJustify' }
      },
      {
        id: 'b_footer',
        name: 'FooterBand1',
        type: 'vox_ReportBand',
        parent: 'ReportVendas',
        left: 10, top: 214, width: 700, height: 30,
        props: { BandType: 'rbPageFooter', Height: 30, Color: '#ffffff', BorderBottom: false }
      },
      {
        id: 'sys_dt',
        name: 'sysDate',
        type: 'vox_ReportSysData',
        parent: 'FooterBand1',
        left: 15, top: 6, width: 250, height: 18,
        props: { SysDataType: 'sdDateTime', Alignment: 'taLeftJustify', FontColor: '#64748b' }
      },
      {
        id: 'sys_pg',
        name: 'sysPages',
        type: 'vox_ReportSysData',
        parent: 'FooterBand1',
        left: 450, top: 6, width: 200, height: 18,
        props: { SysDataType: 'sdPageCount', Alignment: 'taRightJustify', FontColor: '#64748b' }
      }
    ]
  }
};
