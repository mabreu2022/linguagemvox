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
      Color: 'inherit',
      WordWrap: false,
      Visible: true
    },
    events: ['OnClick', 'OnDblClick'],
    render(comp) {
      const isDefaultOrDark = !comp.props.Color || comp.props.Color === 'inherit' || comp.props.Color === 'default' || ['#1a1a1a', '#000000', '#000', '#111827'].includes((comp.props.Color || '').toLowerCase());
      const labelColor = isDefaultOrDark ? 'inherit' : comp.props.Color;
      return `
        <div class="vcl-label" style="color: ${labelColor};">
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
      const activeIdx = (comp.props.ActiveIndex !== undefined && comp.props.ActiveIndex !== '') ? parseInt(comp.props.ActiveIndex, 10) : 0;
      const title = comp.props.Title || 'Meu Sistema';
      const isCollapsed = comp.props.Collapsed === true;
      const textColor = comp.props.TextColor || '#e2e8f0';
      const bgColor = comp.props.BackgroundColor || '#1e2430';

      if (isLeft) {
        // Menu Lateral (Sidebar Vertical à Esquerda - com suporte a mini-sidebar e colapso)
        const icons = ['📁', '🛒', '📊', '⚙️', '📄', '🏷️', '👥', '📦'];
        let itemsHtml = items.map((item, idx) => {
          const cleanItem = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
          const escapedItem = item.replace(/'/g, "\\'");
          const itemColorStyle = idx === activeIdx ? '' : `color: ${textColor};`;
          return `
            <div class="vcl-menu-sidebar-item ${idx === activeIdx ? 'active' : ''}" style="${itemColorStyle}" title="${item} (Duplo-clique para abrir evento OnClick)"
              ondblclick="event.stopPropagation(); if (window.app) window.app.jumpToEvent(window.app.designer.form.components.find(c => c.name === '${comp.name}') || window.app.designer.selectedComponent, 'OnClick_${cleanItem}', '${cleanItem}', '${escapedItem}')">
              <span class="vcl-menu-icon">${icons[idx % icons.length]}</span>
              <span class="vcl-menu-text" style="${isCollapsed ? 'display:none;' : ''}; ${itemColorStyle}">${item}</span>
            </div>
          `;
        }).join('');

        return `
          <div class="vcl-menu-sidebar ${isCollapsed ? 'collapsed' : ''}" style="background: ${bgColor}; color: ${textColor};">
            <div class="vcl-menu-sidebar-brand" style="color: ${textColor};">
              <span class="vcl-menu-collapse-btn" title="Alternar Modo Mini / Expandido (Responsivo)" style="cursor:pointer; font-size:14px; margin-right:4px; color: ${textColor};">☰</span>
              <span class="vcl-menu-brand-text" style="${isCollapsed ? 'display:none;' : ''}; font-weight: 700; letter-spacing: 0.5px; color: ${textColor};">${title}</span>
            </div>
            <div class="vcl-menu-sidebar-items">
              ${itemsHtml}
            </div>
            <div class="vcl-menu-sidebar-footer" style="${isCollapsed ? 'display:none;' : ''}; color: ${textColor}; opacity: 0.75;">
              <span style="font-size: 10px;">vox_MainMenu • Responsivo</span>
            </div>
          </div>
        `;
      } else {
        // Menu Horizontal no Topo (Top Navbar - com suporte a mobile hamburger)
        let itemsHtml = items.map((item, idx) => {
          const cleanItem = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
          const escapedItem = item.replace(/'/g, "\\'");
          const itemColorStyle = idx === activeIdx ? '' : `color: ${textColor};`;
          return `
            <div class="vcl-menu-top-item ${idx === activeIdx ? 'active' : ''}" style="${itemColorStyle}" title="${item} (Duplo-clique para abrir evento OnClick)"
              ondblclick="event.stopPropagation(); if (window.app) window.app.jumpToEvent(window.app.designer.form.components.find(c => c.name === '${comp.name}') || window.app.designer.selectedComponent, 'OnClick_${cleanItem}', '${cleanItem}', '${escapedItem}')">
              <span style="${itemColorStyle}">${item}</span>
            </div>
          `;
        }).join('');

        return `
          <div class="vcl-menu-top" style="background: ${bgColor}; color: ${textColor};">
            <div class="vcl-menu-top-brand" style="color: ${textColor};">
              <span class="vcl-menu-mobile-btn" style="display:none; cursor:pointer; margin-right:6px; color: ${textColor};">☰</span>
              <span>🚀</span>
              <span style="font-weight: 700; margin-right: 8px; color: ${textColor};">${title}</span>
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
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
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
          <span class="vcl-nv-icon" style="font-size: 26px;">🔌</span>
          <span class="vcl-nv-tag" style="background:${badgeColor};">${driver}</span>
        </div>
      `;
    }
  },

  vox_Query: {
    name: 'vox_Query',
    category: 'Data Access',
    label: 'vox_Query',
    icon: '⚡',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Connection: 'vox_Connection1',
      SQL: 'SELECT id, nome, email, cidade, saldo FROM clientes',
      Active: true
    },
    events: ['AfterOpen', 'AfterPost', 'AfterDelete', 'BeforePost'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_Query: ${comp.name}">
          <span class="vcl-nv-icon" style="font-size: 26px; color: #ffca28;">⚡</span>
          <span class="vcl-nv-tag">vox_Qry</span>
        </div>
      `;
    }
  },

  vox_DBTable: {
    name: 'vox_DBTable',
    category: 'Data Access',
    label: 'vox_DBTable',
    icon: '📋',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Connection: '',
      TableName: 'clientes',
      Active: true
    },
    events: ['AfterOpen', 'AfterPost', 'AfterDelete', 'BeforePost'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_DBTable: ${comp.name} [Tabela: ${comp.props.TableName || 'clientes'}]">
          <span class="vcl-nv-icon" style="font-size: 26px; color: #34d399;">📋</span>
          <span class="vcl-nv-tag">vox_Tbl</span>
        </div>
      `;
    }
  },

  vox_DataSource: {
    name: 'vox_DataSource',
    category: 'Data Access',
    label: 'vox_DataSource',
    icon: '🔗',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      DataSet: '',
      AutoEdit: true
    },
    events: ['OnDataChange', 'OnStateChange'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_DataSource: ${comp.name} -> ${comp.props.DataSet || '(None)'}">
          <span class="vcl-nv-icon" style="font-size: 26px; color: #00e5ff;">🔗</span>
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
      DataSource: '',
      Columns: '',
      ReadOnly: false,
      Align: 'alNone'
    },
    events: ['OnCellClick', 'OnDblClick', 'OnTitleClick'],
    render(comp) {
      // 1. Verificar se existe vínculo ativo estrito Delphi: DBGrid -> DataSource -> DataSet (Table/Query)
      const formComps = (window.app && window.app.designer && window.app.designer.form && window.app.designer.form.components) 
        ? window.app.designer.form.components 
        : [];
      
      const dsName = comp.props && comp.props.DataSource ? comp.props.DataSource.trim() : '';
      const dsComp = dsName && dsName !== '(None)' 
        ? formComps.find(c => c.name === dsName && (c.type === 'vox_DataSource' || c.type === 'TVoxDataSource' || c.type === 'TDataSource')) 
        : null;

      const datasetName = dsComp && dsComp.props && dsComp.props.DataSet ? dsComp.props.DataSet.trim() : '';
      const datasetComp = datasetName && datasetName !== '(None)'
        ? formComps.find(c => c.name === datasetName && (
            c.type === 'vox_DBTable' || c.type === 'TVoxDBTable' || c.type === 'TDBTable' ||
            c.type === 'vox_Table' || c.type === 'TVoxTable' || c.type === 'TTable' ||
            c.type === 'vox_Query' || c.type === 'TVoxQuery' || c.type === 'TFDQuery' ||
            c.type === 'vox_MemTable' || c.type === 'TVoxMemTable' || c.type === 'TMemTable' ||
            c.type === 'vox_ClientDataSet' || c.type === 'TClientDataSet'
          ))
        : null;

      const hasValidBinding = !!(dsComp && datasetComp);

      if (!hasValidBinding) {
        // Padrão Delphi: SEM DADOS se não estiver ligado a um DataSource com Table ou Query!
        const colList = comp.props && comp.props.Columns ? comp.props.Columns.split(',').map(c => c.trim()).filter(Boolean) : [];
        const colHeaders = colList.length > 0 
          ? colList.map(c => `<th>${c}</th>`).join('') 
          : '<th style="width:25%;"></th><th style="width:25%;"></th><th style="width:25%;"></th><th style="width:25%;"></th>';
        
        const emptyColsCount = colList.length > 0 ? colList.length : 4;
        let emptyRowsHtml = '';
        for (let i = 0; i < 7; i++) {
          let tds = '<td class="vcl-dbgrid-ind" style="width:14px; background:#eef1f5; border-right:1px solid #c0c6d0;"></td>';
          for (let j = 0; j < emptyColsCount; j++) {
            tds += '<td>&nbsp;</td>';
          }
          emptyRowsHtml += `<tr>${tds}</tr>`;
        }

        return `
          <div class="vcl-dbgrid">
            <div style="flex: 1; overflow: auto; width: 100%; height: 100%;">
              <table class="vcl-dbgrid-table">
                <thead>
                  <tr>
                    <th style="width:14px; text-align:center; padding:2px; color:#64748b;">▶</th>
                    ${colHeaders}
                  </tr>
                </thead>
                <tbody>
                  ${emptyRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // COM vínculo ativo ao DataSource -> Table/Query: exibe as colunas e os dados da tabela/query
      const colList = (comp.props && comp.props.Columns)
        ? comp.props.Columns.split(',').map(c => c.trim()).filter(Boolean)
        : ['id', 'nome', 'email', 'cidade', 'saldo'];

      const headerHtml = colList.map(c => `<th>${c}</th>`).join('');

      return `
        <div class="vcl-dbgrid">
          <div style="flex: 1; overflow: auto; width: 100%; height: 100%;">
            <table class="vcl-dbgrid-table">
              <thead>
                <tr>
                  <th style="width:14px; text-align:center; padding:2px;">▶</th>
                  ${headerHtml}
                </tr>
              </thead>
              <tbody>
                <tr class="selected"><td style="width:14px; background:#0078d4; text-align:center; color:#fff;">▶</td><td>1</td><td>Mauricio Abreu</td><td>mauricio@voxlang.org</td><td>Rio de Janeiro</td><td>1500.50</td></tr>
                <tr><td style="width:14px; background:#eef1f5;"></td><td>2</td><td>Beatriz Lima</td><td>beatriz@email.com</td><td>São Paulo</td><td>3200.00</td></tr>
                <tr><td style="width:14px; background:#eef1f5;"></td><td>3</td><td>Carlos Eduardo</td><td>carlos@empresa.com</td><td>Belo Horizonte</td><td>450.75</td></tr>
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
      DataSource: '',
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
      DataSource: '',
      DataField: '',
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
      DataSource: '',
      DataField: ''
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
      DataSource: '',
      DataField: '',
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
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Interval: 1000,
      Enabled: true
    },
    events: ['OnTimer'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_Timer: ${comp.props.Interval}ms">
          <span class="vcl-nv-icon" style="font-size: 26px; color: #38bdf8;">⏱️</span>
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
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Filter: 'Todos os Arquivos (*.*)|*.*',
      Title: 'Abrir Arquivo'
    },
    events: ['OnExecute'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_OpenDialog">
          <span class="vcl-nv-icon" style="font-size: 26px; color: #f59e0b;">📂</span>
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
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Filter: 'Arquivos Vox (*.vox)|*.vox',
      Title: 'Salvar Arquivo'
    },
    events: ['OnExecute'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_SaveDialog">
          <span class="vcl-nv-icon" style="font-size: 26px; color: #10b981;">💾</span>
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
  },

  // --------------------------------------------------------------------------
  // 6. NOVOS COMPONENTES DELPHI 13 - EXPANDIDOS
  // --------------------------------------------------------------------------

  // --- DATA CONTROLS ---
  vox_DBLookupComboBox: {
    name: 'vox_DBLookupComboBox',
    category: 'Data Controls',
    label: 'vox_DBLookupComboBox',
    icon: '🔍',
    defaultWidth: 160,
    defaultHeight: 26,
    defaultProps: {
      DataSource: 'vox_datasource1',
      DataField: 'cliente_id',
      LookupSource: 'vox_datasource2',
      KeyField: 'id',
      ListField: 'nome',
      Text: 'Selecione...'
    },
    events: ['OnChange', 'OnDropDown', 'OnCloseUp'],
    render(comp) {
      return `
        <div class="vcl-combo vcl-dblookup">
          <span style="font-size:11px; color:#1e293b;">${comp.props.Text || 'Selecione [Lookup]...'}</span>
          <span class="vcl-combo-arrow">🔍</span>
        </div>
      `;
    }
  },

  vox_DBMemo: {
    name: 'vox_DBMemo',
    category: 'Data Controls',
    label: 'vox_DBMemo',
    icon: '📝',
    defaultWidth: 180,
    defaultHeight: 90,
    defaultProps: {
      DataSource: 'vox_datasource1',
      DataField: 'observacoes',
      WordWrap: true,
      ReadOnly: false
    },
    events: ['OnChange', 'OnEnter', 'OnExit'],
    render(comp) {
      return `
        <div class="vcl-memo vcl-dbmemo">
          <span style="color:#64748b; font-size:10px; font-style:italic;">[DB: ${comp.props.DataField || 'observacoes'}]</span>
        </div>
      `;
    }
  },

  vox_DBImage: {
    name: 'vox_DBImage',
    category: 'Data Controls',
    label: 'vox_DBImage',
    icon: '🖼️',
    defaultWidth: 120,
    defaultHeight: 120,
    defaultProps: {
      DataSource: 'vox_datasource1',
      DataField: 'foto',
      Stretch: true,
      Center: true
    },
    events: ['OnClick', 'OnDblClick'],
    render(comp) {
      return `
        <div class="vcl-dbimage" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:4px;">
          <span style="font-size:24px;">🖼️</span>
          <span style="font-size:10px; color:#64748b; margin-top:4px;">[DBImage: ${comp.props.DataField || 'foto'}]</span>
        </div>
      `;
    }
  },

  // --- DATA ACCESS ---
  vox_MemTable: {
    name: 'vox_MemTable',
    category: 'Data Access',
    label: 'vox_MemTable',
    icon: '🧠',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      TableName: 'MemTable1',
      Active: false,
      Filter: '',
      Filtered: false
    },
    events: ['AfterOpen', 'BeforeOpen', 'AfterPost', 'BeforePost', 'OnCalcFields'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_MemTable (Tabela em Memória)">
          <span class="vcl-nv-icon" style="font-size: 26px;">🧠</span>
          <span class="vcl-nv-tag">MemTable</span>
        </div>
      `;
    }
  },

  vox_Transaction: {
    name: 'vox_Transaction',
    category: 'Data Access',
    label: 'vox_Transaction',
    icon: '🔄',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Connection: 'vox_connection1',
      Isolation: 'ReadCommitted',
      AutoCommit: false
    },
    events: ['OnStart', 'OnCommit', 'OnRollback'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_Transaction (Controle de Transações)">
          <span class="vcl-nv-icon" style="font-size: 26px;">🔄</span>
          <span class="vcl-nv-tag">Transact</span>
        </div>
      `;
    }
  },

  vox_StoredProc: {
    name: 'vox_StoredProc',
    category: 'Data Access',
    label: 'vox_StoredProc',
    icon: '⚙️',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Connection: 'vox_connection1',
      StoredProcName: 'sp_calcular_saldo',
      Params: 'p_id:int, p_val:float'
    },
    events: ['BeforeExecute', 'AfterExecute'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_StoredProc">
          <span class="vcl-nv-icon" style="font-size: 26px;">⚙️</span>
          <span class="vcl-nv-tag">StoredProc</span>
        </div>
      `;
    }
  },

  vox_SQLScript: {
    name: 'vox_SQLScript',
    category: 'Data Access',
    label: 'vox_SQLScript',
    icon: '📜',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Connection: 'vox_connection1',
      Script: 'CREATE TABLE IF NOT EXISTS demo (id INT PRIMARY KEY);'
    },
    events: ['BeforeExecute', 'AfterExecute'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_SQLScript">
          <span class="vcl-nv-icon" style="font-size: 26px;">📜</span>
          <span class="vcl-nv-tag">SQLScript</span>
        </div>
      `;
    }
  },

  vox_Table: {
    name: 'vox_Table',
    category: 'Data Access',
    label: 'vox_Table',
    icon: '🗄️',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Connection: 'vox_connection1',
      TableName: 'clientes',
      Active: false
    },
    events: ['AfterOpen', 'BeforeOpen', 'AfterPost'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_Table">
          <span class="vcl-nv-icon" style="font-size: 26px;">🗄️</span>
          <span class="vcl-nv-tag">Table</span>
        </div>
      `;
    }
  },

  vox_RESTClient: {
    name: 'vox_RESTClient',
    category: 'Data Access',
    label: 'vox_RESTClient',
    icon: '🌐',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      BaseURL: 'https://api.exemplo.com/v1',
      ContentType: 'application/json',
      Timeout: 30000
    },
    events: ['OnError', 'OnBeforeRequest'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_RESTClient">
          <span class="vcl-nv-icon" style="font-size: 26px;">🌐</span>
          <span class="vcl-nv-tag">RESTClient</span>
        </div>
      `;
    }
  },

  vox_RESTRequest: {
    name: 'vox_RESTRequest',
    category: 'Data Access',
    label: 'vox_RESTRequest',
    icon: '📡',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Client: 'vox_restclient1',
      Method: 'GET',
      Resource: 'clientes',
      Params: ''
    },
    events: ['OnAfterExecute', 'OnError'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_RESTRequest">
          <span class="vcl-nv-icon" style="font-size: 26px;">📡</span>
          <span class="vcl-nv-tag">RESTReq</span>
        </div>
      `;
    }
  },

  vox_RESTAdapter: {
    name: 'vox_RESTAdapter',
    category: 'Data Access',
    label: 'vox_RESTAdapter',
    icon: '🔌',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Request: 'vox_restrequest1',
      DataSet: 'vox_memtable1',
      RootElement: 'data'
    },
    events: ['OnUpdatePayload'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_RESTAdapter">
          <span class="vcl-nv-icon" style="font-size: 26px;">🔌</span>
          <span class="vcl-nv-tag">RESTAdapter</span>
        </div>
      `;
    }
  },

  // --- ADDITIONAL ---
  vox_BitBtn: {
    name: 'vox_BitBtn',
    category: 'Additional',
    label: 'vox_BitBtn',
    icon: '🆗',
    defaultWidth: 95,
    defaultHeight: 28,
    defaultProps: {
      Caption: '&OK',
      Kind: 'bkOK',
      ModalResult: 'mrOk',
      Glyph: 'check',
      Enabled: true
    },
    events: ['OnClick'],
    render(comp) {
      const icon = comp.props.Kind === 'bkCancel' ? '❌' : (comp.props.Kind === 'bkClose' ? '🚪' : '✔️');
      return `
        <div class="vcl-button vcl-bitbtn">
          <span style="margin-right:4px;">${icon}</span>
          <span>${comp.props.Caption || '&OK'}</span>
        </div>
      `;
    }
  },

  vox_MaskEdit: {
    name: 'vox_MaskEdit',
    category: 'Additional',
    label: 'vox_MaskEdit',
    icon: '🎭',
    defaultWidth: 150,
    defaultHeight: 24,
    defaultProps: {
      Text: '',
      EditMask: '!999.999.999-99;1;_',
      Placeholder: '000.000.000-00',
      MaxLength: 14,
      Enabled: true
    },
    events: ['OnChange', 'OnExit', 'OnEnter'],
    render(comp) {
      return `
        <div class="vcl-edit vcl-maskedit">
          <span style="color:${comp.props.Text ? 'inherit' : '#94a3b8'};">${comp.props.Text || comp.props.Placeholder || '000.000.000-00'}</span>
        </div>
      `;
    }
  },

  vox_StringGrid: {
    name: 'vox_StringGrid',
    category: 'Additional',
    label: 'vox_StringGrid',
    icon: '▦',
    defaultWidth: 260,
    defaultHeight: 140,
    defaultProps: {
      ColCount: 4,
      RowCount: 4,
      FixedCols: 1,
      FixedRows: 1,
      DefaultColWidth: 60,
      DefaultRowHeight: 24
    },
    events: ['OnSelectCell', 'OnDrawCell', 'OnClick'],
    render(comp) {
      return `
        <div class="vcl-stringgrid" style="width:100%; height:100%; background:#fff; border:1px solid #cbd5e1; display:grid; grid-template-columns: 40px repeat(3, 1fr); grid-template-rows: repeat(4, 24px); font-size:11px; text-align:center;">
          <div style="background:#e2e8f0; font-weight:bold; border-right:1px solid #cbd5e1; border-bottom:1px solid #cbd5e1; line-height:24px;">#</div>
          <div style="background:#e2e8f0; font-weight:bold; border-right:1px solid #cbd5e1; border-bottom:1px solid #cbd5e1; line-height:24px;">A</div>
          <div style="background:#e2e8f0; font-weight:bold; border-right:1px solid #cbd5e1; border-bottom:1px solid #cbd5e1; line-height:24px;">B</div>
          <div style="background:#e2e8f0; font-weight:bold; border-bottom:1px solid #cbd5e1; line-height:24px;">C</div>
          <div style="background:#f1f5f9; font-weight:bold; border-right:1px solid #cbd5e1; border-bottom:1px solid #f1f5f9; line-height:24px;">1</div>
          <div style="border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; line-height:24px;">100</div>
          <div style="border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; line-height:24px;">Alpha</div>
          <div style="border-bottom:1px solid #f1f5f9; line-height:24px;">Sim</div>
          <div style="background:#f1f5f9; font-weight:bold; border-right:1px solid #cbd5e1; border-bottom:1px solid #f1f5f9; line-height:24px;">2</div>
          <div style="border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; line-height:24px;">200</div>
          <div style="border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; line-height:24px;">Beta</div>
          <div style="border-bottom:1px solid #f1f5f9; line-height:24px;">Não</div>
        </div>
      `;
    }
  },

  vox_LabeledEdit: {
    name: 'vox_LabeledEdit',
    category: 'Additional',
    label: 'vox_LabeledEdit',
    icon: '🏷️',
    defaultWidth: 160,
    defaultHeight: 46,
    defaultProps: {
      Text: '',
      EditLabel: 'Código:',
      LabelPosition: 'lpAbove',
      LabelSpacing: 4
    },
    events: ['OnChange', 'OnEnter', 'OnExit'],
    render(comp) {
      return `
        <div class="vcl-labelededit" style="display:flex; flex-direction:column; gap:${comp.props.LabelSpacing || 4}px;">
          <label style="font-size:11px; font-weight:600; color:#1e293b;">${comp.props.EditLabel || 'Código:'}</label>
          <div class="vcl-edit" style="height:24px;">${comp.props.Text || ''}</div>
        </div>
      `;
    }
  },

  vox_ScrollBox: {
    name: 'vox_ScrollBox',
    category: 'Additional',
    label: 'vox_ScrollBox',
    icon: '📜',
    isContainer: true,
    defaultWidth: 260,
    defaultHeight: 180,
    defaultProps: {
      Align: 'alNone',
      AutoScroll: true,
      BorderStyle: 'bsSingle',
      Color: '#ffffff'
    },
    events: ['OnScroll'],
    render(comp) {
      return `
        <div class="vcl-scrollbox" style="width:100%; height:100%; border:1px solid #cbd5e1; background:${comp.props.Color || '#ffffff'}; overflow:auto; position:relative;">
          <span style="position:absolute; right:6px; bottom:6px; font-size:10px; color:#94a3b8;">📜 ScrollBox</span>
        </div>
      `;
    }
  },

  vox_Splitter: {
    name: 'vox_Splitter',
    category: 'Additional',
    label: 'vox_Splitter',
    icon: '↔️',
    defaultWidth: 6,
    defaultHeight: 150,
    defaultProps: {
      Align: 'alLeft',
      MinSize: 30,
      Beveled: true
    },
    events: ['OnMoved'],
    render(comp) {
      return `
        <div class="vcl-splitter" style="width:100%; height:100%; background:#cbd5e1; border-left:1px solid #94a3b8; cursor:col-resize; display:flex; align-items:center; justify-content:center;">
          <div style="width:2px; height:16px; background:#64748b; border-radius:1px;"></div>
        </div>
      `;
    }
  },

  vox_Bevel: {
    name: 'vox_Bevel',
    category: 'Additional',
    label: 'vox_Bevel',
    icon: '🔲',
    defaultWidth: 150,
    defaultHeight: 4,
    defaultProps: {
      Shape: 'bsTopLine',
      Style: 'bsLowered'
    },
    events: [],
    render(comp) {
      return `
        <div class="vcl-bevel" style="width:100%; height:100%; border-top:1px solid #94a3b8; border-bottom:1px solid #ffffff;"></div>
      `;
    }
  },

  vox_FlowPanel: {
    name: 'vox_FlowPanel',
    category: 'Additional',
    label: 'vox_FlowPanel',
    icon: '🌊',
    isContainer: true,
    defaultWidth: 260,
    defaultHeight: 120,
    defaultProps: {
      Align: 'alNone',
      FlowStyle: 'fsLeftRightTopBottom',
      Padding: 8
    },
    events: [],
    render(comp) {
      return `
        <div class="vcl-flowpanel" style="width:100%; height:100%; border:1px dashed #38bdf8; background:rgba(56,189,248,0.05); position:relative; border-radius:4px;">
          <span style="position:absolute; top:4px; left:6px; font-size:10px; color:#0284c7; font-weight:600;">🌊 FlowPanel (Flexbox)</span>
        </div>
      `;
    }
  },

  vox_GridPanel: {
    name: 'vox_GridPanel',
    category: 'Additional',
    label: 'vox_GridPanel',
    icon: '⊞',
    isContainer: true,
    defaultWidth: 260,
    defaultHeight: 140,
    defaultProps: {
      Align: 'alNone',
      RowCount: 2,
      ColumnCount: 2,
      Padding: 8
    },
    events: [],
    render(comp) {
      return `
        <div class="vcl-gridpanel" style="width:100%; height:100%; border:1px dashed #6366f1; background:rgba(99,102,241,0.05); position:relative; border-radius:4px;">
          <span style="position:absolute; top:4px; left:6px; font-size:10px; color:#4f46e5; font-weight:600;">⊞ GridPanel (CSS Grid)</span>
        </div>
      `;
    }
  },

  vox_SplitView: {
    name: 'vox_SplitView',
    category: 'Additional',
    label: 'vox_SplitView',
    icon: '📂',
    isContainer: true,
    defaultWidth: 180,
    defaultHeight: 300,
    defaultProps: {
      Align: 'alLeft',
      CompactWidth: 48,
      OpenedWidth: 180,
      Opened: true,
      Placement: 'svLeft'
    },
    events: ['OnOpening', 'OnClosing', 'OnClosed'],
    render(comp) {
      return `
        <div class="vcl-splitview" style="width:100%; height:100%; background:#1e2430; color:#fff; border-right:1px solid #334155; display:flex; flex-direction:column; padding:8px;">
          <div style="font-weight:700; font-size:12px; display:flex; align-items:center; gap:6px; padding-bottom:8px; border-bottom:1px solid #334155;">
            <span>📂</span> <span>Menu Gaveta</span>
          </div>
        </div>
      `;
    }
  },

  // --- WIN32 ---
  vox_TreeView: {
    name: 'vox_TreeView',
    category: 'Win32',
    label: 'vox_TreeView',
    icon: '🌲',
    defaultWidth: 160,
    defaultHeight: 160,
    defaultProps: {
      Items: 'Raiz/Item 1, Raiz/Item 2, Configurações/Opção A',
      ReadOnly: true,
      ShowLines: true,
      ShowRoot: true
    },
    events: ['OnChange', 'OnExpanding', 'OnCollapsing', 'OnClick'],
    render(comp) {
      return `
        <div class="vcl-treeview" style="width:100%; height:100%; background:#fff; border:1px solid #cbd5e1; padding:6px; font-size:11px; overflow:hidden; color:#1e293b;">
          <div>📂 <strong>Principal</strong></div>
          <div style="padding-left:14px;">├── 📄 Item 1</div>
          <div style="padding-left:14px;">└── 📄 Item 2</div>
          <div>📂 <strong>Configurações</strong></div>
          <div style="padding-left:14px;">└── ⚙️ Geral</div>
        </div>
      `;
    }
  },

  vox_ListView: {
    name: 'vox_ListView',
    category: 'Win32',
    label: 'vox_ListView',
    icon: '📑',
    defaultWidth: 240,
    defaultHeight: 140,
    defaultProps: {
      Columns: 'Código, Descrição, Valor',
      ViewStyle: 'vsReport',
      GridLines: true,
      RowSelect: true
    },
    events: ['OnClick', 'OnDblClick', 'OnSelectItem'],
    render(comp) {
      return `
        <div class="vcl-listview" style="width:100%; height:100%; background:#fff; border:1px solid #cbd5e1; font-size:11px; display:flex; flex-direction:column;">
          <div style="display:flex; background:#e2e8f0; border-bottom:1px solid #cbd5e1; font-weight:600; padding:4px 6px; color:#1e293b;">
            <div style="flex:1;">Código</div><div style="flex:2;">Descrição</div><div style="flex:1;">Valor</div>
          </div>
          <div style="padding:4px 6px; border-bottom:1px solid #f1f5f9; display:flex; color:#334155;">
            <div style="flex:1;">001</div><div style="flex:2;">Item Alpha</div><div style="flex:1;">12.50</div>
          </div>
          <div style="padding:4px 6px; border-bottom:1px solid #f1f5f9; display:flex; color:#334155;">
            <div style="flex:1;">002</div><div style="flex:2;">Item Beta</div><div style="flex:1;">45.00</div>
          </div>
        </div>
      `;
    }
  },

  vox_StatusBar: {
    name: 'vox_StatusBar',
    category: 'Win32',
    label: 'vox_StatusBar',
    icon: 'ℹ️',
    isContainer: true,
    defaultWidth: 700,
    defaultHeight: 24,
    defaultProps: {
      Align: 'alBottom',
      Panels: 'Pronto, Usuário: Admin, NUM',
      SimplePanel: false
    },
    events: ['OnClick'],
    render(comp) {
      const panels = (comp.props.Panels || 'Pronto, Usuário: Admin, NUM').split(',').map(p => p.trim());
      const panelsHtml = panels.map(p => `<div style="border-right:1px solid #cbd5e1; padding:0 8px; font-size:11px; color:#475569;">${p}</div>`).join('');
      return `
        <div class="vcl-statusbar" style="width:100%; height:100%; background:#f1f5f9; border-top:1px solid #cbd5e1; display:flex; align-items:center;">
          ${panelsHtml}
        </div>
      `;
    }
  },

  vox_ToolBar: {
    name: 'vox_ToolBar',
    category: 'Win32',
    label: 'vox_ToolBar',
    icon: '🛠️',
    isContainer: true,
    defaultWidth: 700,
    defaultHeight: 34,
    defaultProps: {
      Align: 'alTop',
      ButtonWidth: 28,
      ButtonHeight: 28,
      Flat: true,
      ShowCaptions: false
    },
    events: [],
    render(comp) {
      return `
        <div class="vcl-toolbar" style="width:100%; height:100%; background:#f8fafc; border-bottom:1px solid #cbd5e1; display:flex; align-items:center; gap:4px; padding:0 6px;">
          <button style="width:26px; height:26px; border:1px solid #cbd5e1; background:#fff; border-radius:3px; cursor:pointer;" title="Novo">📄</button>
          <button style="width:26px; height:26px; border:1px solid #cbd5e1; background:#fff; border-radius:3px; cursor:pointer;" title="Abrir">📂</button>
          <button style="width:26px; height:26px; border:1px solid #cbd5e1; background:#fff; border-radius:3px; cursor:pointer;" title="Salvar">💾</button>
          <div style="width:1px; height:18px; background:#cbd5e1; margin:0 4px;"></div>
          <button style="width:26px; height:26px; border:1px solid #cbd5e1; background:#fff; border-radius:3px; cursor:pointer;" title="Imprimir">🖨️</button>
        </div>
      `;
    }
  },

  vox_RichEdit: {
    name: 'vox_RichEdit',
    category: 'Win32',
    label: 'vox_RichEdit',
    icon: '🖋️',
    defaultWidth: 200,
    defaultHeight: 110,
    defaultProps: {
      Lines: 'Texto formatado RichEdit',
      ReadOnly: false,
      WordWrap: true
    },
    events: ['OnChange', 'OnSelectionChange'],
    render(comp) {
      return `
        <div class="vcl-richedit" style="width:100%; height:100%; background:#fff; border:1px solid #cbd5e1; padding:6px; font-family:'Segoe UI',sans-serif; font-size:12px; color:#1e293b; overflow:auto;">
          <strong>RichEdit</strong> • <em>Formatação Rica</em>
        </div>
      `;
    }
  },

  vox_NumberBox: {
    name: 'vox_NumberBox',
    category: 'Win32',
    label: 'vox_NumberBox',
    icon: '🔢',
    defaultWidth: 120,
    defaultHeight: 24,
    defaultProps: {
      Value: 0.00,
      MinValue: 0,
      MaxValue: 999999,
      Decimal: 2,
      CurrencyFormat: 'R$ '
    },
    events: ['OnChange', 'OnExit'],
    render(comp) {
      const val = parseFloat(comp.props.Value || 0).toFixed(parseInt(comp.props.Decimal, 10) || 2);
      const prefix = comp.props.CurrencyFormat || '';
      return `
        <div class="vcl-edit vcl-numberbox" style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:600; color:#1e293b;">${prefix}${val}</span>
          <div style="display:flex; flex-direction:column; font-size:8px; line-height:8px; color:#64748b;">
            <span>▲</span><span>▼</span>
          </div>
        </div>
      `;
    }
  },

  vox_ActivityIndicator: {
    name: 'vox_ActivityIndicator',
    category: 'Win32',
    label: 'vox_ActivityIndicator',
    icon: '⏳',
    defaultWidth: 32,
    defaultHeight: 32,
    defaultProps: {
      Animate: true,
      IndicatorType: 'aitRotatingSector',
      IndicatorSize: 'aisMedium'
    },
    events: [],
    render(comp) {
      return `
        <div class="vcl-activity-indicator" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center;" title="ActivityIndicator">
          <div style="width:22px; height:22px; border:3px solid #cbd5e1; border-top-color:#0078d4; border-radius:50%; animation:spin 1s linear infinite;"></div>
        </div>
      `;
    }
  },

  // --- STANDARD (MENUS / ACTIONS) ---
  vox_ActionList: {
    name: 'vox_ActionList',
    category: 'Standard',
    label: 'vox_ActionList',
    icon: '⚡',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Actions: 'actSalvar, actExcluir, actImprimir, actFechar'
    },
    events: ['OnExecute', 'OnUpdate'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_ActionList">
          <span class="vcl-nv-icon" style="font-size: 26px; color:#f59e0b;">⚡</span>
          <span class="vcl-nv-tag">ActionList</span>
        </div>
      `;
    }
  },

  vox_PopupMenu: {
    name: 'vox_PopupMenu',
    category: 'Standard',
    label: 'vox_PopupMenu',
    icon: '📋',
    isNonVisual: true,
    defaultWidth: 46,
    defaultHeight: 46,
    defaultProps: {
      Items: 'Copiar, Colar, Excluir, Propriedades'
    },
    events: ['OnPopup'],
    render(comp) {
      return `
        <div class="vcl-non-visual" title="vox_PopupMenu">
          <span class="vcl-nv-icon" style="font-size: 26px; color:#3b82f6;">📋</span>
          <span class="vcl-nv-tag">PopMenu</span>
        </div>
      `;
    }
  },

  // --------------------------------------------------------------------------
  // 9. REPORTS (Relatórios HTML / Exportação PDF Padrão Delphi)
  // --------------------------------------------------------------------------
  vox_Report: {
    name: 'vox_Report',
    category: 'Reports',
    label: 'vox_Report',
    icon: '📑',
    isContainer: true,
    defaultWidth: 700,
    defaultHeight: 500,
    defaultProps: {
      ReportTitle: 'Relatório Vox',
      PageOrientation: 'poPortrait',
      PageSize: 'psA4',
      MarginLeft: 10,
      MarginTop: 15,
      MarginRight: 10,
      MarginBottom: 15,
      DataSource: '(None)',
      ShowHeaderFooterOnFirstPage: true,
      FontFamily: 'Segoe UI, Arial, sans-serif',
      FontSize: 10
    },
    events: ['OnBeforePrint', 'OnAfterPrint'],
    render(comp) {
      const orient = comp.props.PageOrientation === 'poLandscape' ? 'Paisagem (Landscape)' : 'Retrato (Portrait)';
      const size = comp.props.PageSize || 'psA4';
      const ds = comp.props.DataSource || '(None)';
      return `
        <div class="delphi-report-container" style="width:100%; height:100%; box-sizing:border-box; background:#fbfbfb; border:2px dashed #94a3b8; border-radius:4px; position:relative; overflow:hidden;">
          <div class="delphi-report-header-bar" style="background:#334155; color:#ffffff; padding:5px 10px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px; font-weight:bold;">
              <span>📑</span>
              <span>${comp.props.ReportTitle || comp.name}</span>
            </div>
            <div style="font-size:10px; color:#cbd5e1; display:flex; gap:8px;">
              <span>${size}</span>
              <span>•</span>
              <span>${orient}</span>
              <span>•</span>
              <span style="color:#67e8f9; font-weight:600;">DS: ${ds}</span>
            </div>
          </div>
          <div class="delphi-report-watermark" style="position:absolute; bottom:6px; right:8px; font-size:9px; color:#94a3b8; pointer-events:none;">
            Folha de Relatório (${comp.name})
          </div>
        </div>
      `;
    }
  },

  vox_ReportBand: {
    name: 'vox_ReportBand',
    category: 'Reports',
    label: 'vox_ReportBand',
    icon: '➖',
    isContainer: true,
    defaultWidth: 680,
    defaultHeight: 40,
    defaultProps: {
      BandType: 'rbDetail',
      Height: 40,
      Color: '#ffffff',
      BorderBottom: true,
      PrintOnFirstPage: true,
      PrintOnLastPage: true
    },
    events: ['BeforePrint', 'AfterPrint'],
    render(comp) {
      const bt = comp.props.BandType || 'rbDetail';
      const typeInfo = {
        'rbTitle': { label: 'TITLE', color: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
        'rbPageHeader': { label: 'PAGE HEADER', color: '#0284c7', bg: '#e0f2fe', text: '#0369a1' },
        'rbColumnHeader': { label: 'COLUMN HEADER', color: '#0ea5e9', bg: '#f0f9ff', text: '#0284c7' },
        'rbDetail': { label: 'DETAIL', color: '#10b981', bg: '#d1fae5', text: '#065f46' },
        'rbSummary': { label: 'SUMMARY', color: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6' },
        'rbPageFooter': { label: 'PAGE FOOTER', color: '#64748b', bg: '#f1f5f9', text: '#334155' },
        'rbGroupHeader': { label: 'GROUP HEADER', color: '#d97706', bg: '#fef3c7', text: '#78350f' },
        'rbGroupFooter': { label: 'GROUP FOOTER', color: '#7c3aed', bg: '#ede9fe', text: '#4c1d95' }
      }[bt] || { label: bt, color: '#64748b', bg: '#f1f5f9', text: '#334155' };

      const borderCss = comp.props.BorderBottom !== false ? 'border-bottom: 1px dashed #cbd5e1;' : '';
      const bg = comp.props.Color && comp.props.Color !== '#ffffff' ? comp.props.Color : '#ffffff';

      return `
        <div class="delphi-report-band" style="width:100%; height:100%; background:${bg}; box-sizing:border-box; position:relative; ${borderCss}">
          <div class="delphi-band-tag" style="position:absolute; top:0; left:0; background:${typeInfo.color}; color:#fff; font-size:9px; font-weight:bold; padding:2px 6px; border-bottom-right-radius:4px; display:flex; align-items:center; gap:4px; z-index:2; pointer-events:none;">
            <span>${comp.name}</span>
            <span style="opacity:0.85;">(${typeInfo.label})</span>
          </div>
        </div>
      `;
    }
  },

  vox_ReportLabel: {
    name: 'vox_ReportLabel',
    category: 'Reports',
    label: 'vox_ReportLabel',
    icon: '🏷️',
    defaultWidth: 100,
    defaultHeight: 20,
    defaultProps: {
      Caption: 'ReportLabel',
      FontFamily: 'Segoe UI, Arial, sans-serif',
      FontSize: 10,
      FontBold: false,
      FontItalic: false,
      FontColor: '#000000',
      Alignment: 'taLeftJustify',
      WordWrap: false
    },
    events: [],
    render(comp) {
      const align = comp.props.Alignment === 'taRightJustify' ? 'right' : (comp.props.Alignment === 'taCenter' ? 'center' : 'left');
      const bold = comp.props.FontBold ? 'bold' : 'normal';
      const italic = comp.props.FontItalic ? 'italic' : 'normal';
      const size = comp.props.FontSize ? `${comp.props.FontSize}pt` : '10pt';
      const color = comp.props.FontColor || '#000000';
      return `
        <div class="delphi-report-label" style="width:100%; height:100%; display:flex; align-items:center; justify-content:${align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start')}; font-size:${size}; font-weight:${bold}; font-style:${italic}; color:${color}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; box-sizing:border-box; border:1px dotted rgba(0,0,0,0.15);">
          ${comp.props.Caption || comp.name}
        </div>
      `;
    }
  },

  vox_ReportDBText: {
    name: 'vox_ReportDBText',
    category: 'Reports',
    label: 'vox_ReportDBText',
    icon: '📊',
    defaultWidth: 100,
    defaultHeight: 20,
    defaultProps: {
      DataField: '',
      DataSource: '(None)',
      DisplayFormat: '(None)',
      Prefix: '',
      Suffix: '',
      FontFamily: 'Segoe UI, Arial, sans-serif',
      FontSize: 10,
      FontBold: false,
      FontItalic: false,
      FontColor: '#0f172a',
      Alignment: 'taLeftJustify'
    },
    events: [],
    render(comp) {
      const field = comp.props.DataField ? `[${comp.props.DataField}]` : `[${comp.name}]`;
      const align = comp.props.Alignment === 'taRightJustify' ? 'right' : (comp.props.Alignment === 'taCenter' ? 'center' : 'left');
      const bold = comp.props.FontBold ? 'bold' : 'normal';
      const color = comp.props.FontColor || '#0f172a';
      return `
        <div class="delphi-report-dbtext" style="width:100%; height:100%; display:flex; align-items:center; justify-content:${align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start')}; font-size:9.5pt; font-weight:${bold}; color:${color}; background:rgba(16, 185, 129, 0.08); border:1px dashed #10b981; border-radius:2px; padding:0 4px; box-sizing:border-box; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <span style="color:#059669; font-weight:600; margin-right:4px; font-size:9px;">DB:</span>
          <span>${field}</span>
        </div>
      `;
    }
  },

  vox_ReportSysData: {
    name: 'vox_ReportSysData',
    category: 'Reports',
    label: 'vox_ReportSysData',
    icon: '⏱️',
    defaultWidth: 120,
    defaultHeight: 20,
    defaultProps: {
      SysDataType: 'sdPageCount',
      Text: '',
      FontFamily: 'Segoe UI, Arial, sans-serif',
      FontSize: 9,
      FontBold: false,
      FontColor: '#64748b',
      Alignment: 'taRightJustify'
    },
    events: [],
    render(comp) {
      const typeLabels = {
        'sdDate': 'Data Atual',
        'sdTime': 'Hora Atual',
        'sdDateTime': 'Data e Hora',
        'sdPageNumber': 'Página X',
        'sdPageCount': 'Página X de Y',
        'sdRecordCount': 'Total de Registros',
        'sdReportTitle': 'Título do Relatório'
      };
      const typeName = typeLabels[comp.props.SysDataType] || comp.props.SysDataType || 'Página X de Y';
      const align = comp.props.Alignment === 'taRightJustify' ? 'right' : (comp.props.Alignment === 'taCenter' ? 'center' : 'left');
      return `
        <div class="delphi-report-sysdata" style="width:100%; height:100%; display:flex; align-items:center; justify-content:${align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start')}; font-size:9pt; color:${comp.props.FontColor || '#64748b'}; background:rgba(99, 102, 241, 0.08); border:1px dashed #6366f1; border-radius:2px; padding:0 4px; box-sizing:border-box; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <span style="color:#4f46e5; margin-right:4px;">⏱️</span>
          <span>${typeName}</span>
        </div>
      `;
    }
  },

  vox_ReportShape: {
    name: 'vox_ReportShape',
    category: 'Reports',
    label: 'vox_ReportShape',
    icon: '📏',
    defaultWidth: 200,
    defaultHeight: 6,
    defaultProps: {
      ShapeType: 'stHorizontalLine',
      PenColor: '#cbd5e1',
      PenWidth: 1,
      BrushColor: '#ffffff'
    },
    events: [],
    render(comp) {
      const st = comp.props.ShapeType || 'stHorizontalLine';
      const color = comp.props.PenColor || '#cbd5e1';
      const width = parseInt(comp.props.PenWidth, 10) || 1;
      let inner = '';
      if (st === 'stHorizontalLine') {
        inner = `<div style="width:100%; border-top:${width}px solid ${color};"></div>`;
      } else if (st === 'stVerticalLine') {
        inner = `<div style="height:100%; border-left:${width}px solid ${color}; margin:0 auto;"></div>`;
      } else if (st === 'stRoundRect') {
        inner = `<div style="width:100%; height:100%; border:${width}px solid ${color}; border-radius:6px; background:${comp.props.BrushColor || 'transparent'};"></div>`;
      } else {
        inner = `<div style="width:100%; height:100%; border:${width}px solid ${color}; background:${comp.props.BrushColor || 'transparent'};"></div>`;
      }
      return `
        <div class="delphi-report-shape" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">
          ${inner}
        </div>
      `;
    }
  },

  vox_ReportImage: {
    name: 'vox_ReportImage',
    category: 'Reports',
    label: 'vox_ReportImage',
    icon: '🖼️',
    defaultWidth: 80,
    defaultHeight: 50,
    defaultProps: {
      Picture: '',
      Stretch: true,
      Proportional: true
    },
    events: [],
    render(comp) {
      const pic = comp.props.Picture;
      const fit = comp.props.Proportional ? 'contain' : (comp.props.Stretch ? 'fill' : 'none');
      if (pic) {
        return `
          <div class="delphi-report-image" style="width:100%; height:100%; border:1px dashed #cbd5e1; box-sizing:border-box; overflow:hidden;">
            <img src="${pic}" style="width:100%; height:100%; object-fit:${fit}; display:block;" />
          </div>
        `;
      }
      return `
        <div class="delphi-report-image" style="width:100%; height:100%; border:1px dashed #cbd5e1; background:#f8fafc; color:#94a3b8; display:flex; flex-direction:column; align-items:center; justify-content:center; box-sizing:border-box; font-size:10px;">
          <span style="font-size:16px;">🖼️</span>
          <span>Logo/Imagem</span>
        </div>
      `;
    }
  }
};

// ============================================================================
// 1. Padronização Institucional: TVox[Componente] e getVoxClassType
// ============================================================================
Object.keys(window.VOX_COMPONENTS).forEach(k => {
  const c = window.VOX_COMPONENTS[k];
  if (c && !c.className) {
    if (c.name.startsWith('vox_')) {
      c.className = 'TVox' + c.name.substring(4);
    } else if (c.name.startsWith('TVox')) {
      c.className = c.name;
    } else {
      c.className = 'TVox' + c.name;
    }
  }
});

// Helper canônico global para obter o tipo institucional TVox... de qualquer componente ou string de tipo
window.getVoxClassType = function(typeOrComp) {
  if (!typeOrComp) return 'TVoxComponent';
  if (typeof typeOrComp === 'object') {
    if (typeOrComp.className) return typeOrComp.className;
    typeOrComp = typeOrComp.type || '';
  }
  const t = String(typeOrComp).trim();
  if (t === 'form' || t === '__form__' || t === 'Form' || t === 'TForm' || t === 'TVoxForm') return 'TVoxForm';
  const meta = window.VOX_COMPONENTS && window.VOX_COMPONENTS[t];
  if (meta && meta.className) return meta.className;
  if (t.startsWith('TVox')) return t;
  if (t.startsWith('vox_')) {
    const raw = t.substring(4);
    return 'TVox' + raw;
  }
  if (t.startsWith('T')) {
    return 'TVox' + t.substring(1);
  }
  return 'TVox' + t.charAt(0).toUpperCase() + t.slice(1);
};

// Atribuir className canônico a todos os componentes e criar aliases oficiais TVox[Componente]
Object.values(window.VOX_COMPONENTS).forEach(c => {
  if (c && c.name) {
    if (!c.className) {
      c.className = window.getVoxClassType(c.name);
    }
    if (!window.VOX_COMPONENTS[c.className]) {
      window.VOX_COMPONENTS[c.className] = c;
    }
  }
});

// Aliases de Retrocompatibilidade para importação de projetos legados
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
window.VOX_COMPONENTS['TVoxDBGrid'] = window.VOX_COMPONENTS['vox_DBGrid'];
window.VOX_COMPONENTS['TDBNavigator'] = window.VOX_COMPONENTS['vox_DBNavigator'];
window.VOX_COMPONENTS['TVoxDBNavigator'] = window.VOX_COMPONENTS['vox_DBNavigator'];
window.VOX_COMPONENTS['TDBEdit'] = window.VOX_COMPONENTS['vox_DBEdit'];
window.VOX_COMPONENTS['TVoxDBEdit'] = window.VOX_COMPONENTS['vox_DBEdit'];
window.VOX_COMPONENTS['vox_Table'] = window.VOX_COMPONENTS['vox_DBTable'];
window.VOX_COMPONENTS['TDBTable'] = window.VOX_COMPONENTS['vox_DBTable'];
window.VOX_COMPONENTS['TVoxDBTable'] = window.VOX_COMPONENTS['vox_DBTable'];
window.VOX_COMPONENTS['TTable'] = window.VOX_COMPONENTS['vox_DBTable'];
window.VOX_COMPONENTS['TVoxTable'] = window.VOX_COMPONENTS['vox_DBTable'];
window.VOX_COMPONENTS['TMainMenu'] = window.VOX_COMPONENTS['vox_MainMenu'];
window.VOX_COMPONENTS['TRadioGroup'] = window.VOX_COMPONENTS['vox_RadioGroup'];
window.VOX_COMPONENTS['Vox_RadioGroup'] = window.VOX_COMPONENTS['vox_RadioGroup'];
window.VOX_COMPONENTS['TCheckListBox'] = window.VOX_COMPONENTS['vox_CheckListGroupBox'];
window.VOX_COMPONENTS['Vox_CheckListGroupBox'] = window.VOX_COMPONENTS['vox_CheckListGroupBox'];
window.VOX_COMPONENTS['TPageControl'] = window.VOX_COMPONENTS['vox_PageControl'];
window.VOX_COMPONENTS['TVoxPageControl'] = window.VOX_COMPONENTS['vox_PageControl'];
window.VOX_COMPONENTS['TTabSheet'] = window.VOX_COMPONENTS['vox_TabSheet'];
window.VOX_COMPONENTS['TVoxTabSheet'] = window.VOX_COMPONENTS['vox_TabSheet'];

// Aliases Delphi para Relatórios (QuickReport / FastReport)
window.VOX_COMPONENTS['TQuickRep'] = window.VOX_COMPONENTS['vox_Report'];
window.VOX_COMPONENTS['TVoxReport'] = window.VOX_COMPONENTS['vox_Report'];
window.VOX_COMPONENTS['TQRBand'] = window.VOX_COMPONENTS['vox_ReportBand'];
window.VOX_COMPONENTS['TVoxReportBand'] = window.VOX_COMPONENTS['vox_ReportBand'];
window.VOX_COMPONENTS['TQRLabel'] = window.VOX_COMPONENTS['vox_ReportLabel'];
window.VOX_COMPONENTS['TVoxReportLabel'] = window.VOX_COMPONENTS['vox_ReportLabel'];
window.VOX_COMPONENTS['TQRDBText'] = window.VOX_COMPONENTS['vox_ReportDBText'];
window.VOX_COMPONENTS['TVoxReportDBText'] = window.VOX_COMPONENTS['vox_ReportDBText'];
window.VOX_COMPONENTS['TQRSysData'] = window.VOX_COMPONENTS['vox_ReportSysData'];
window.VOX_COMPONENTS['TVoxReportSysData'] = window.VOX_COMPONENTS['vox_ReportSysData'];
window.VOX_COMPONENTS['TQRShape'] = window.VOX_COMPONENTS['vox_ReportShape'];
window.VOX_COMPONENTS['TVoxReportShape'] = window.VOX_COMPONENTS['vox_ReportShape'];
window.VOX_COMPONENTS['TQRImage'] = window.VOX_COMPONENTS['vox_ReportImage'];
window.VOX_COMPONENTS['TVoxReportImage'] = window.VOX_COMPONENTS['vox_ReportImage'];


// Função para registrar novos componentes criados pela Fábrica de Componentes (Component Factory)
window.registerCustomComponent = function(compDef) {
  if (!compDef || !compDef.name) return false;
  if (!compDef.className) {
    compDef.className = compDef.name.startsWith('TVox') ? compDef.name : ('TVox' + (compDef.name.startsWith('vox_') ? compDef.name.substring(4) : compDef.name));
  }
  window.VOX_COMPONENTS[compDef.name] = compDef;
  window.VOX_COMPONENTS[compDef.className] = compDef;
  if (window.app) {
    window.app.initPalette();
    window.app.showToast(`✨ Componente ${compDef.name} registrado com sucesso na Paleta!`);
  }
  return true;
};
