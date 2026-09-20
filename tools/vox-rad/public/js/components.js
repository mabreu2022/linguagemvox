// ==============================================================================
// tools/vox-rad/public/js/components.js — Catálogo de Componentes Vox Studio RAD
// Padronizado com prefixo vox_* e catálogo expandido de todos os tipos
// ==============================================================================

window.VOX_COMPONENTS = {
  // --------------------------------------------------------------------------
  // 1. STANDARD
  // --------------------------------------------------------------------------
  vox_Button: {
    name: 'vox_Button',
    category: 'Standard',
    label: 'vox_Button',
    icon: '🔘',
    defaultWidth: 90,
    defaultHeight: 28,
    defaultProps: {
      Caption: 'Button1',
      Enabled: true,
      Visible: true,
      Default: false
    },
    events: ['OnClick', 'OnDblClick', 'OnEnter', 'OnExit'],
    render(comp) {
      return `
        <div class="vcl-button" style="opacity: ${comp.props.Enabled !== false ? '1' : '0.5'};">
          ${comp.props.Caption || 'Button'}
        </div>
      `;
    }
  },

  vox_Edit: {
    name: 'vox_Edit',
    category: 'Standard',
    label: 'vox_Edit',
    icon: '📝',
    defaultWidth: 150,
    defaultHeight: 24,
    defaultProps: {
      Text: 'Edit1',
      MaxLength: 0,
      ReadOnly: false,
      Enabled: true,
      Visible: true
    },
    events: ['OnChange', 'OnEnter', 'OnExit', 'OnKeyDown'],
    render(comp) {
      return `
        <div class="vcl-edit" style="opacity: ${comp.props.Enabled !== false ? '1' : '0.5'};">
          ${comp.props.Text || ''}
        </div>
      `;
    }
  },

  vox_Label: {
    name: 'vox_Label',
    category: 'Standard',
    label: 'vox_Label',
    icon: '🏷️',
    defaultWidth: 75,
    defaultHeight: 18,
    defaultProps: {
      Caption: 'Label1',
      Color: '#1a1a1a',
      WordWrap: false,
      Visible: true
    },
    events: ['OnClick', 'OnDblClick'],
    render(comp) {
      return `
        <div class="vcl-label" style="color: ${comp.props.Color || '#1a1a1a'};">
          ${comp.props.Caption || 'Label1'}
        </div>
      `;
    }
  },

  vox_CheckBox: {
    name: 'vox_CheckBox',
    category: 'Standard',
    label: 'vox_CheckBox',
    icon: '☑️',
    defaultWidth: 120,
    defaultHeight: 22,
    defaultProps: {
      Caption: 'CheckBox1',
      Checked: false,
      Enabled: true
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-checkbox" style="opacity: ${comp.props.Enabled !== false ? '1' : '0.5'};">
          <input type="checkbox" ${comp.props.Checked ? 'checked' : ''} tabindex="-1">
          <span>${comp.props.Caption || 'CheckBox1'}</span>
        </div>
      `;
    }
  },

  vox_RadioButton: {
    name: 'vox_RadioButton',
    category: 'Standard',
    label: 'vox_RadioButton',
    icon: '🔘',
    defaultWidth: 120,
    defaultHeight: 22,
    defaultProps: {
      Caption: 'RadioButton1',
      Checked: false,
      Enabled: true
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-radio" style="opacity: ${comp.props.Enabled !== false ? '1' : '0.5'};">
          <input type="radio" ${comp.props.Checked ? 'checked' : ''} tabindex="-1">
          <span>${comp.props.Caption || 'RadioButton1'}</span>
        </div>
      `;
    }
  },

  vox_RadioGroup: {
    name: 'vox_RadioGroup',
    category: 'Standard',
    label: 'vox_RadioGroup',
    icon: '📻',
    isContainer: true,
    defaultWidth: 200,
    defaultHeight: 125,
    defaultProps: {
      Caption: 'RadioGroup1',
      Items: 'Opção 1, Opção 2, Opção 3',
      ItemIndex: 0,
      Columns: 1,
      Align: 'alNone',
      Enabled: true
    },
    events: ['OnClick', 'OnSelectionChange'],
    render(comp) {
      const items = (comp.props.Items || 'Opção 1, Opção 2, Opção 3')
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);
      const selIdx = parseInt(comp.props.ItemIndex, 10);
      const cols = Math.max(1, parseInt(comp.props.Columns, 10) || 1);
      const caption = comp.props.Caption || 'RadioGroup';

      const itemsHtml = items.map((item, idx) => `
        <label class="vcl-radiogroup-item">
          <input type="radio" name="rg_${comp.id}" value="${idx}" ${idx === selIdx ? 'checked' : ''} tabindex="-1">
          <span>${item}</span>
        </label>
      `).join('');

      return `
        <div class="vcl-radiogroup">
          <span class="vcl-groupbox-caption">${caption}</span>
          <div class="vcl-radiogroup-items" style="grid-template-columns: repeat(${cols}, 1fr);">
            ${itemsHtml || '<span style="font-size:10px; color:#94a3b8;">(Sem itens)</span>'}
          </div>
        </div>
      `;
    }
  },

  vox_ComboBox: {
    name: 'vox_ComboBox',
    category: 'Standard',
    label: 'vox_ComboBox',
    icon: '🔽',
    defaultWidth: 150,
    defaultHeight: 24,
    defaultProps: {
      Text: 'ComboBox1',
      Items: 'Item 1, Item 2, Item 3',
      Enabled: true
    },
    events: ['OnChange', 'OnSelect'],
    render(comp) {
      return `
        <div class="vcl-combo">
          <span>${comp.props.Text || 'Selecione...'}</span>
          <span class="vcl-combo-arrow">▼</span>
        </div>
      `;
    }
  },

  vox_ListBox: {
    name: 'vox_ListBox',
    category: 'Standard',
    label: 'vox_ListBox',
    icon: '📋',
    defaultWidth: 150,
    defaultHeight: 90,
    defaultProps: {
      Items: 'Item 1, Item 2, Item 3',
      MultiSelect: false
    },
    events: ['OnClick', 'OnDblClick'],
    render(comp) {
      const items = (comp.props.Items || '').split(',').map(i => i.trim()).filter(Boolean);
      const itemsHtml = items.map((it, idx) => `<div class="vcl-listbox-item ${idx === 0 ? 'selected' : ''}">${it}</div>`).join('');
      return `
        <div class="vcl-listbox">
          ${itemsHtml || '<div class="vcl-listbox-item">(Lista Vazia)</div>'}
        </div>
      `;
    }
  },

  vox_Memo: {
    name: 'vox_Memo',
    category: 'Standard',
    label: 'vox_Memo',
    icon: '📄',
    defaultWidth: 180,
    defaultHeight: 90,
    defaultProps: {
      Lines: 'Memo1',
      WordWrap: true,
      ReadOnly: false
    },
    events: ['OnChange', 'OnEnter', 'OnExit'],
    render(comp) {
      return `
        <div class="vcl-memo">
          ${(comp.props.Lines || '').replace(/\n/g, '<br>')}
        </div>
      `;
    }
  },

  vox_MainMenu: {
    name: 'vox_MainMenu',
    category: 'Standard',
    label: 'vox_MainMenu',
    icon: '🧭',
    defaultWidth: 700,
    defaultHeight: 40,
    defaultProps: {
      Layout: 'Top', // 'Top' (Horizontal no Topo) ou 'Left' (Lateral à Esquerda)
      Title: 'Meu Sistema',
      Items: 'Cadastros, Vendas, Relatórios, Configurações',
      BackgroundColor: '#1e2430',
      TextColor: '#e2e8f0',
      ActiveIndex: 0,
      Responsive: true,
      Collapsed: false
    },
    events: ['OnItemClick', 'OnToggleCollapse'],
    render(comp) {
      const isLeft = comp.props.Layout === 'Left';
      const items = (comp.props.Items || 'Cadastros, Vendas, Relatórios, Configurações')
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);
      const activeIdx = comp.props.ActiveIndex || 0;
      const title = comp.props.Title || 'Meu Sistema';
      const isCollapsed = comp.props.Collapsed === true;

      if (isLeft) {
        // Menu Lateral (Sidebar Vertical à Esquerda - com suporte a mini-sidebar e colapso)
        const icons = ['📁', '🛒', '📊', '⚙️', '📄', '🏷️', '👥', '📦'];
        let itemsHtml = items.map((item, idx) => `
          <div class="vcl-menu-sidebar-item ${idx === activeIdx ? 'active' : ''}" title="${item}">
            <span class="vcl-menu-icon">${icons[idx % icons.length]}</span>
            <span class="vcl-menu-text" style="${isCollapsed ? 'display:none;' : ''}">${item}</span>
          </div>
        `).join('');

        return `
          <div class="vcl-menu-sidebar ${isCollapsed ? 'collapsed' : ''}" style="background: ${comp.props.BackgroundColor || ''}; color: ${comp.props.TextColor || ''};">
            <div class="vcl-menu-sidebar-brand">
              <span class="vcl-menu-collapse-btn" title="Alternar Modo Mini / Expandido (Responsivo)" style="cursor:pointer; font-size:14px; margin-right:4px;">☰</span>
              <span class="vcl-menu-brand-text" style="${isCollapsed ? 'display:none;' : ''}; font-weight: 700; letter-spacing: 0.5px;">${title}</span>
            </div>
            <div class="vcl-menu-sidebar-items">
              ${itemsHtml}
            </div>
            <div class="vcl-menu-sidebar-footer" style="${isCollapsed ? 'display:none;' : ''}">
              <span style="font-size: 10px; opacity: 0.7;">vox_MainMenu • Responsivo</span>
            </div>
          </div>
        `;
      } else {
        // Menu Horizontal no Topo (Top Navbar - com suporte a mobile hamburger)
        let itemsHtml = items.map((item, idx) => `
          <div class="vcl-menu-top-item ${idx === activeIdx ? 'active' : ''}">
            <span>${item}</span>
          </div>
        `).join('');

        return `
          <div class="vcl-menu-top" style="background: ${comp.props.BackgroundColor || ''}; color: ${comp.props.TextColor || ''};">
            <div class="vcl-menu-top-brand">
              <span class="vcl-menu-mobile-btn" style="display:none; cursor:pointer; margin-right:6px;">☰</span>
              <span>🚀</span>
              <span style="font-weight: 700; margin-right: 8px;">${title}</span>
            </div>
            <div class="vcl-menu-top-items">
              ${itemsHtml}
            </div>
          </div>
        `;
      }
    }
  },

  // --------------------------------------------------------------------------
  // 2. ADDITIONAL & LAYOUT
  // --------------------------------------------------------------------------
  vox_GroupBox: {
    name: 'vox_GroupBox',
    category: 'Additional',
    label: 'vox_GroupBox',
    icon: '🗂️',
    isContainer: true,
    defaultWidth: 240,
    defaultHeight: 140,
    defaultProps: {
      Caption: 'GroupBox1',
      Align: 'alNone'
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-groupbox">
          <span class="vcl-groupbox-caption">${comp.props.Caption || 'GroupBox'}</span>
        </div>
      `;
    }
  },

  vox_CheckListGroupBox: {
    name: 'vox_CheckListGroupBox',
    category: 'Additional',
    label: 'vox_CheckListGroupBox',
    icon: '☑️',
    isContainer: true,
    defaultWidth: 220,
    defaultHeight: 135,
    defaultProps: {
      Caption: 'CheckListGroupBox1',
      Items: 'Item 1, Item 2, Item 3, Item 4',
      CheckedIndices: '0, 1',
      Columns: 1,
      Align: 'alNone',
      Enabled: true
    },
    events: ['OnClick', 'OnItemCheckChange'],
    render(comp) {
      const items = (comp.props.Items || 'Item 1, Item 2, Item 3, Item 4')
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);
      const checkedArr = (comp.props.CheckedIndices || '')
        .toString()
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));
      const cols = Math.max(1, parseInt(comp.props.Columns, 10) || 1);
      const caption = comp.props.Caption || 'CheckListGroupBox';

      const itemsHtml = items.map((item, idx) => `
        <label class="vcl-checklist-item">
          <input type="checkbox" value="${idx}" ${checkedArr.includes(idx) ? 'checked' : ''} tabindex="-1">
          <span>${item}</span>
        </label>
      `).join('');

      return `
        <div class="vcl-checklistbox">
          <span class="vcl-groupbox-caption">${caption}</span>
          <div class="vcl-checklist-items" style="grid-template-columns: repeat(${cols}, 1fr);">
            ${itemsHtml || '<span style="font-size:10px; color:#94a3b8;">(Sem itens)</span>'}
          </div>
        </div>
      `;
    }
  },

  vox_Panel: {
    name: 'vox_Panel',
    category: 'Additional',
    label: 'vox_Panel',
    icon: '🔲',
    isContainer: true,
    defaultWidth: 200,
    defaultHeight: 120,
    defaultProps: {
      Caption: 'Panel1',
      BevelOuter: 'bvRaised',
      Color: '#e9ecef',
      Align: 'alNone',
      Alignment: 'taCenter'
    },
    events: ['OnClick', 'OnDblClick'],
    render(comp) {
      const align = (comp.props && comp.props.Alignment) || 'taCenter';
      const alignClass = align === 'taLeftJustify' ? 'text-left' :
                         align === 'taRightJustify' ? 'text-right' : 'text-center';
      return `
        <div class="vcl-panel" style="background: ${comp.props.Color || '#e9ecef'};">
          <span class="vcl-panel-caption ${alignClass}">${comp.props.Caption || ''}</span>
        </div>
      `;
    }
  },

  vox_SpeedButton: {
    name: 'vox_SpeedButton',
    category: 'Additional',
    label: 'vox_SpeedButton',
    icon: '⚡',
    defaultWidth: 32,
    defaultHeight: 32,
    defaultProps: {
      Caption: '⚡',
      Flat: true,
      Hint: 'Ação Rápida'
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-speedbtn" title="${comp.props.Hint || ''}">
          ${comp.props.Caption || '⚡'}
        </div>
      `;
    }
  },

  vox_Image: {
    name: 'vox_Image',
    category: 'Additional',
    label: 'vox_Image',
    icon: '🖼️',
    defaultWidth: 120,
    defaultHeight: 100,
    defaultProps: {
      PictureUrl: '',
      Stretch: true,
      Center: true
    },
    events: ['OnClick', 'OnDblClick'],
    render(comp) {
      if (comp.props.PictureUrl) {
        return `
          <div class="vcl-image" style="background-image: url('${comp.props.PictureUrl}'); background-size: ${comp.props.Stretch ? 'contain' : 'auto'};"></div>
        `;
      }
      return `
        <div class="vcl-image placeholder">
          <span>🖼️ Imagem</span>
        </div>
      `;
    }
  },

  vox_Card: {
    name: 'vox_Card',
    category: 'Additional',
    label: 'vox_Card',
    icon: '💳',
    isContainer: true,
    defaultWidth: 200,
    defaultHeight: 120,
    defaultProps: {
      Title: 'Card Moderno',
      Subtitle: 'Descrição resumida',
      Elevation: 2,
      Align: 'alNone'
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-card">
          <div class="vcl-card-header">${comp.props.Title || 'Card'}</div>
          <div class="vcl-card-body">${comp.props.Subtitle || ''}</div>
        </div>
      `;
    }
  },

  vox_Badge: {
    name: 'vox_Badge',
    category: 'Additional',
    label: 'vox_Badge',
    icon: '🏷️',
    defaultWidth: 70,
    defaultHeight: 22,
    defaultProps: {
      Text: 'Ativo',
      Color: '#22c55e',
      TextColor: '#ffffff'
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-badge" style="background: ${comp.props.Color || '#22c55e'}; color: ${comp.props.TextColor || '#ffffff'};">
          ${comp.props.Text || 'Badge'}
        </div>
      `;
    }
  },

  vox_Switch: {
    name: 'vox_Switch',
    category: 'Additional',
    label: 'vox_Switch',
    icon: '🎚️',
    defaultWidth: 50,
    defaultHeight: 24,
    defaultProps: {
      Checked: true,
      Color: '#0078d4'
    },
    events: ['OnChange'],
    render(comp) {
      return `
        <div class="vcl-switch ${comp.props.Checked ? 'checked' : ''}">
          <div class="vcl-switch-handle"></div>
        </div>
      `;
    }
  },

  vox_Shape: {
    name: 'vox_Shape',
    category: 'Additional',
    label: 'vox_Shape',
    icon: '🔷',
    defaultWidth: 80,
    defaultHeight: 60,
    defaultProps: {
      Shape: 'Rectangle', // Rectangle, RoundRect, Ellipse
      BrushColor: '#0078d4',
      PenColor: '#1c4b78'
    },
    events: ['OnClick'],
    render(comp) {
      const radius = comp.props.Shape === 'Ellipse' ? '50%' : (comp.props.Shape === 'RoundRect' ? '8px' : '0px');
      return `
        <div class="vcl-shape" style="background: ${comp.props.BrushColor || '#0078d4'}; border: 2px solid ${comp.props.PenColor || '#1c4b78'}; border-radius: ${radius};"></div>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // 3. CONTROLS & INPUTS AVANÇADOS
  // --------------------------------------------------------------------------
  vox_ProgressBar: {
    name: 'vox_ProgressBar',
    category: 'Win32',
    label: 'vox_ProgressBar',
    icon: '📊',
    defaultWidth: 160,
    defaultHeight: 18,
    defaultProps: {
      Min: 0,
      Max: 100,
      Position: 65,
      Color: '#0078d4'
    },
    events: [],
    render(comp) {
      const pos = Math.min(100, Math.max(0, comp.props.Position || 50));
      return `
        <div class="vcl-progress-bar">
          <div class="vcl-progress-fill" style="width: ${pos}%; background: ${comp.props.Color || '#0078d4'};"></div>
        </div>
      `;
    }
  },

  vox_Slider: {
    name: 'vox_Slider',
    category: 'Win32',
    label: 'vox_Slider',
    icon: '🎚️',
    defaultWidth: 140,
    defaultHeight: 24,
    defaultProps: {
      Min: 0,
      Max: 100,
      Value: 40
    },
    events: ['OnChange'],
    render(comp) {
      return `
        <div class="vcl-slider">
          <input type="range" min="${comp.props.Min || 0}" max="${comp.props.Max || 100}" value="${comp.props.Value || 40}" tabindex="-1">
        </div>
      `;
    }
  },

  vox_DatePicker: {
    name: 'vox_DatePicker',
    category: 'Win32',
    label: 'vox_DatePicker',
    icon: '📅',
    defaultWidth: 130,
    defaultHeight: 24,
    defaultProps: {
      DateFormat: 'YYYY-MM-DD',
      Value: '2026-09-20'
    },
    events: ['OnChange'],
    render(comp) {
      return `
        <div class="vcl-datepicker">
          <span>📅 ${comp.props.Value || '2026-09-20'}</span>
        </div>
      `;
    }
  },

  vox_ColorPicker: {
    name: 'vox_ColorPicker',
    category: 'Win32',
    label: 'vox_ColorPicker',
    icon: '🎨',
    defaultWidth: 40,
    defaultHeight: 26,
    defaultProps: {
      Color: '#0078d4'
    },
    events: ['OnChange'],
    render(comp) {
      return `
        <div class="vcl-colorpicker" style="background: ${comp.props.Color || '#0078d4'};"></div>
      `;
    }
  },

  vox_PageControl: {
    name: 'vox_PageControl',
    category: 'Win32',
    label: 'vox_PageControl',
    icon: '📑',
    isContainer: true,
    defaultWidth: 360,
    defaultHeight: 220,
    defaultProps: {
      ActivePageIndex: 0,
      TabPosition: 'tpTop', // tpTop, tpBottom
      Align: 'alNone'
    },
    events: ['OnChange', 'OnChanging'],
    render(comp) {
      const activeIdx = parseInt(comp.props.ActivePageIndex, 10) || 0;
      const tabPos = comp.props.TabPosition || 'tpTop';

      let pages = [];
      if (window.app && window.app.designer && window.app.designer.form && window.app.designer.form.components) {
        pages = window.app.designer.form.components.filter(c =>
          (c.type === 'vox_TabSheet' || c.type === 'TTabSheet') && c.parent === comp.name
        );
      }
      if (pages.length === 0) {
        pages = [
          { name: 'TabSheet1', props: { Caption: 'Geral', PageIndex: 0 } },
          { name: 'TabSheet2', props: { Caption: 'Detalhes', PageIndex: 1 } }
        ];
      }

      const tabsHtml = pages.map((p, idx) => {
        const isActive = idx === activeIdx;
        const caption = (p.props && p.props.Caption) || p.name || `Aba ${idx + 1}`;
        return `
          <div class="vcl-tab-item ${isActive ? 'active' : ''}" data-tab-index="${idx}" data-pagecontrol="${comp.name}" data-tabsheet="${p.name}" title="${caption}">
            <span>${caption}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="vcl-pagecontrol tab-pos-${tabPos.toLowerCase()}">
          <div class="vcl-tab-bar">
            ${tabsHtml}
            <div class="vcl-tab-add-btn" data-pagecontrol="${comp.name}" title="Nova Página (+)">+</div>
          </div>
          <div class="vcl-pagecontrol-body"></div>
        </div>
      `;
    }
  },

  vox_TabSheet: {
    name: 'vox_TabSheet',
    category: 'Win32',
    label: 'vox_TabSheet',
    icon: '📄',
    isContainer: true,
    defaultWidth: 350,
    defaultHeight: 180,
    defaultProps: {
      Caption: 'TabSheet1',
      PageIndex: 0,
      ImageIndex: -1
    },
    events: ['OnShow', 'OnHide'],
    render(comp) {
      return `
        <div class="vcl-tabsheet"></div>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // 4. DATA ACCESS (BANCO DE DADOS & REST)
  // --------------------------------------------------------------------------
  vox_Connection: {
    name: 'vox_Connection',
    category: 'Data Access',
    label: 'vox_Connection',
    icon: '🔌',
    defaultWidth: 38,
    defaultHeight: 38,
    defaultProps: {
      DriverName: 'MySQL', // MySQL, MSSQL, Firebird, SQLite, PostgreSQL
      Server: '127.0.0.1',
      Port: 3306,
      Database: 'loja_vox',
      UserName: 'root',
      Password: '',
      VendorLib: 'libmysql.dll',
      Connected: true,
      LoginPrompt: false,
      CharSet: 'UTF8'
    },
    events: ['AfterConnect', 'BeforeConnect', 'AfterDisconnect', 'OnError'],
    render(comp) {
      const driver = comp.props.DriverName || 'MySQL';
      let badgeColor = '#0078d4';
      if (driver === 'Firebird') badgeColor = '#f97316';
      else if (driver === 'MySQL') badgeColor = '#0284c7';
      else if (driver === 'MSSQL' || driver === 'SQLServer') badgeColor = '#ef4444';
      else if (driver === 'PostgreSQL') badgeColor = '#3b82f6';
      else if (driver === 'SQLite') badgeColor = '#10b981';

      const server = comp.props.Server || comp.props.IP || '127.0.0.1';
      const port = comp.props.Port !== undefined ? comp.props.Port : (comp.props.Porta || 3306);
      const user = comp.props.UserName || comp.props.Login || 'root';

      return `
        <div class="vcl-non-visual" title="vox_Connection: ${comp.name} [${driver} -> ${server}:${port} | User: ${user}] (Duplo-clique para Configurar Conexão)" ondblclick="window.app.openConnectionEditor('${comp.id}')">
          <span style="font-size: 18px;">🔌</span>
          <span class="vcl-nv-tag" style="background:${badgeColor}; font-size:9px;">${driver}</span>
        </div>
      `;
    }
  },

  vox_Query: {
    name: 'vox_Query',
    category: 'Data Access',
    label: 'vox_Query',
    icon: '⚡',
    defaultWidth: 38,
    defaultHeight: 38,
    defaultProps: {
      Connection: 'vox_Connection1',
      SQL: 'SELECT id, nome, email, cidade, saldo FROM clientes',
      Active: true
    },
    events: ['AfterOpen', 'AfterPost', 'AfterDelete', 'BeforePost'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_Query: ${comp.name}">
          <span style="font-size: 18px; color: #ffca28;">⚡</span>
          <span class="vcl-nv-tag">vox_Qry</span>
        </div>
      `;
    }
  },

  vox_DataSource: {
    name: 'vox_DataSource',
    category: 'Data Access',
    label: 'vox_DataSource',
    icon: '🔗',
    defaultWidth: 38,
    defaultHeight: 38,
    defaultProps: {
      DataSet: 'vox_Query1',
      AutoEdit: true
    },
    events: ['OnDataChange', 'OnStateChange'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_DataSource: ${comp.name} -> ${comp.props.DataSet}">
          <span style="font-size: 18px; color: #00e5ff;">🔗</span>
          <span class="vcl-nv-tag">vox_DS</span>
        </div>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // 5. DATA CONTROLS (DATA-AWARE)
  // --------------------------------------------------------------------------
  vox_DBGrid: {
    name: 'vox_DBGrid',
    category: 'Data Controls',
    label: 'vox_DBGrid',
    icon: '📊',
    defaultWidth: 620,
    defaultHeight: 180,
    defaultProps: {
      DataSource: 'vox_DataSource1',
      Columns: 'id, nome, email, cidade, saldo',
      ReadOnly: false,
      Align: 'alNone'
    },
    events: ['OnCellClick', 'OnDblClick', 'OnTitleClick'],
    render(comp) {
      const cols = (comp.props.Columns || 'id, nome, email, cidade, saldo').split(',').map(c => c.trim());
      const headerHtml = cols.map(c => `<th>${c}</th>`).join('');
      return `
        <div class="vcl-dbgrid">
          <div style="flex: 1; overflow: auto; width: 100%; height: 100%;">
            <table class="vcl-dbgrid-table">
              <thead><tr>${headerHtml}</tr></thead>
              <tbody>
                <tr class="selected"><td>1</td><td>Mauricio Abreu</td><td>mauricio@voxlang.org</td><td>Rio de Janeiro</td><td>1500.50</td></tr>
                <tr><td>2</td><td>Beatriz Lima</td><td>beatriz@email.com</td><td>São Paulo</td><td>3200.00</td></tr>
                <tr><td>3</td><td>Carlos Eduardo</td><td>carlos@empresa.com</td><td>Belo Horizonte</td><td>450.75</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  },

  vox_DBNavigator: {
    name: 'vox_DBNavigator',
    category: 'Data Controls',
    label: 'vox_DBNavigator',
    icon: '🎛️',
    defaultWidth: 280,
    defaultHeight: 28,
    defaultProps: {
      DataSource: 'vox_DataSource1',
      VisibleButtons: 'First,Prior,Next,Last,Insert,Delete,Edit,Post,Cancel,Refresh'
    },
    events: [
      'OnClick', 'BeforeAction',
      'OnFirstClick', 'OnPriorClick', 'OnNextClick', 'OnLastClick',
      'OnInsertClick', 'OnDeleteClick', 'OnEditClick', 'OnPostClick',
      'OnCancelClick', 'OnRefreshClick'
    ],
    render(comp) {
      return `
        <div class="vcl-dbnavigator" style="display:flex; flex-direction:row; width:100%; height:100%; box-sizing:border-box;">
          <button title="Primeiro (|◀)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%;">|◀</button>
          <button title="Anterior (◀)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%;">◀</button>
          <button title="Próximo (▶)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%;">▶</button>
          <button title="Último (▶|)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%;">▶|</button>
          <button title="Novo (+)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%; color:#22c55e;">➕</button>
          <button title="Excluir (-)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%; color:#ef4444;">🗑</button>
          <button title="Editar (✏️)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%; color:#f59e0b;">✏️</button>
          <button title="Gravar / Salvar (💾)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%; color:#38bdf8;">💾</button>
          <button title="Cancelar (❌)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%; color:#94a3b8;">❌</button>
          <button title="Atualizar (🔄)" tabindex="-1" style="flex:1 1 0; min-width:0; height:100%; color:#a855f7;">🔄</button>
        </div>
      `;
    }
  },

  vox_DBEdit: {
    name: 'vox_DBEdit',
    category: 'Data Controls',
    label: 'vox_DBEdit',
    icon: '🔤',
    defaultWidth: 150,
    defaultHeight: 24,
    defaultProps: {
      DataSource: 'vox_DataSource1',
      DataField: 'nome',
      ReadOnly: false
    },
    events: ['OnChange', 'OnEnter', 'OnExit'],
    render(comp) {
      return `
        <div class="vcl-edit vcl-dbedit" title="DataSource: ${comp.props.DataSource} | Campo: ${comp.props.DataField}">
          <span>[${comp.props.DataField || 'campo'}]</span>
        </div>
      `;
    }
  },

  vox_DBText: {
    name: 'vox_DBText',
    category: 'Data Controls',
    label: 'vox_DBText',
    icon: '🔤',
    defaultWidth: 90,
    defaultHeight: 18,
    defaultProps: {
      DataSource: 'vox_DataSource1',
      DataField: 'saldo'
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-label" style="font-weight: 600; color: #0078d4;">
          <span>[${comp.props.DataField || 'saldo'}]</span>
        </div>
      `;
    }
  },

  vox_DBCheckBox: {
    name: 'vox_DBCheckBox',
    category: 'Data Controls',
    label: 'vox_DBCheckBox',
    icon: '☑️',
    defaultWidth: 120,
    defaultHeight: 22,
    defaultProps: {
      DataSource: 'vox_DataSource1',
      DataField: 'ativo',
      Caption: 'Cliente Ativo'
    },
    events: ['OnClick'],
    render(comp) {
      return `
        <div class="vcl-checkbox">
          <input type="checkbox" checked tabindex="-1">
          <span>${comp.props.Caption || 'Ativo'}</span>
        </div>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // 6. SYSTEM & DIALOGS
  // --------------------------------------------------------------------------
  vox_Timer: {
    name: 'vox_Timer',
    category: 'System',
    label: 'vox_Timer',
    icon: '⏱️',
    defaultWidth: 38,
    defaultHeight: 38,
    defaultProps: {
      Interval: 1000,
      Enabled: true
    },
    events: ['OnTimer'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_Timer: ${comp.props.Interval}ms">
          <span style="font-size: 18px; color: #38bdf8;">⏱️</span>
          <span class="vcl-nv-tag">vox_Timer</span>
        </div>
      `;
    }
  },

  vox_OpenDialog: {
    name: 'vox_OpenDialog',
    category: 'Dialogs',
    label: 'vox_OpenDialog',
    icon: '📂',
    defaultWidth: 38,
    defaultHeight: 38,
    defaultProps: {
      Filter: 'Todos os Arquivos (*.*)|*.*',
      Title: 'Abrir Arquivo'
    },
    events: ['OnExecute'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_OpenDialog">
          <span style="font-size: 18px; color: #f59e0b;">📂</span>
          <span class="vcl-nv-tag">OpenDlg</span>
        </div>
      `;
    }
  },

  vox_SaveDialog: {
    name: 'vox_SaveDialog',
    category: 'Dialogs',
    label: 'vox_SaveDialog',
    icon: '💾',
    defaultWidth: 38,
    defaultHeight: 38,
    defaultProps: {
      Filter: 'Arquivos Vox (*.vox)|*.vox',
      Title: 'Salvar Arquivo'
    },
    events: ['OnExecute'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_SaveDialog">
          <span style="font-size: 18px; color: #10b981;">💾</span>
          <span class="vcl-nv-tag">SaveDlg</span>
        </div>
      `;
    }
  },

  // Componente de Exemplo Oficial do Ecossistema .vdpk
  vox_RatingStars: {
    name: 'vox_RatingStars',
    category: 'Custom',
    label: 'vox_RatingStars',
    icon: '⭐',
    defaultWidth: 140,
    defaultHeight: 32,
    defaultProps: {
      Rating: 4.5,
      StarsCount: 5,
      ActiveColor: '#ffca28'
    },
    events: ['OnChange', 'OnClick'],
    render(comp) {
      return `
        <div class="vcl-rating-stars" style="display:flex; align-items:center; gap:3px; font-size:16px; color:${comp.props.ActiveColor || '#ffca28'}; cursor:pointer;" title="Rating: ${comp.props.Rating || 4.5}">
          <span>⭐</span><span>⭐</span><span>⭐</span><span>⭐</span><span style="opacity:0.4;">⭐</span>
          <span style="font-size:11px; color:#94a3b8; margin-left:4px;">(${comp.props.Rating || 4.5})</span>
        </div>
      `;
    }
  }
};

// Aliases de Retrocompatibilidade para que projetos antigos continuem funcionando
window.VOX_COMPONENTS['TButton'] = window.VOX_COMPONENTS['vox_Button'];
window.VOX_COMPONENTS['TEdit'] = window.VOX_COMPONENTS['vox_Edit'];
window.VOX_COMPONENTS['TLabel'] = window.VOX_COMPONENTS['vox_Label'];
window.VOX_COMPONENTS['TGroupBox'] = window.VOX_COMPONENTS['vox_GroupBox'];
window.VOX_COMPONENTS['TPanel'] = window.VOX_COMPONENTS['vox_Panel'];
window.VOX_COMPONENTS['TCheckBox'] = window.VOX_COMPONENTS['vox_CheckBox'];
window.VOX_COMPONENTS['TRadioButton'] = window.VOX_COMPONENTS['vox_RadioButton'];
window.VOX_COMPONENTS['TComboBox'] = window.VOX_COMPONENTS['vox_ComboBox'];
window.VOX_COMPONENTS['TListBox'] = window.VOX_COMPONENTS['vox_ListBox'];
window.VOX_COMPONENTS['TMemo'] = window.VOX_COMPONENTS['vox_Memo'];
window.VOX_COMPONENTS['TFDConnection'] = window.VOX_COMPONENTS['vox_Connection'];
window.VOX_COMPONENTS['TFDQuery'] = window.VOX_COMPONENTS['vox_Query'];
window.VOX_COMPONENTS['TDataSource'] = window.VOX_COMPONENTS['vox_DataSource'];
window.VOX_COMPONENTS['TDBGrid'] = window.VOX_COMPONENTS['vox_DBGrid'];
window.VOX_COMPONENTS['TDBNavigator'] = window.VOX_COMPONENTS['vox_DBNavigator'];
window.VOX_COMPONENTS['TDBEdit'] = window.VOX_COMPONENTS['vox_DBEdit'];
window.VOX_COMPONENTS['TMainMenu'] = window.VOX_COMPONENTS['vox_MainMenu'];
window.VOX_COMPONENTS['TRadioGroup'] = window.VOX_COMPONENTS['vox_RadioGroup'];
window.VOX_COMPONENTS['Vox_RadioGroup'] = window.VOX_COMPONENTS['vox_RadioGroup'];
window.VOX_COMPONENTS['TCheckListBox'] = window.VOX_COMPONENTS['vox_CheckListGroupBox'];
window.VOX_COMPONENTS['Vox_CheckListGroupBox'] = window.VOX_COMPONENTS['vox_CheckListGroupBox'];
window.VOX_COMPONENTS['TPageControl'] = window.VOX_COMPONENTS['vox_PageControl'];
window.VOX_COMPONENTS['TTabSheet'] = window.VOX_COMPONENTS['vox_TabSheet'];

// Função para registrar novos componentes criados pela Fábrica de Componentes (Component Factory)
window.registerCustomComponent = function(compDef) {
  if (!compDef || !compDef.name) return false;
  window.VOX_COMPONENTS[compDef.name] = compDef;
  if (window.app) {
    window.app.initPalette();
    window.app.showToast(`✨ Componente ${compDef.name} registrado com sucesso na Paleta!`);
  }
  return true;
};
