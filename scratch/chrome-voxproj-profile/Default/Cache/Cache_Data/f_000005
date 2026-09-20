// ==============================================================================
// tools/vox-rad/public/js/inspector.js — Object Inspector Padrão Delphi
// ==============================================================================

class VoxObjectInspector {
  constructor() {
    this.currentTab = 'properties';
    this.target = null;
    this.searchFilter = '';

    this.init();
  }

  init() {
    this.compSelector = document.getElementById('oiComponentDropdown');
    this.propsContainer = document.getElementById('oiPropertiesContainer');
    this.eventsContainer = document.getElementById('oiEventsContainer');
    this.searchInput = document.getElementById('oiSearchInput');

    if (this.compSelector) {
      this.compSelector.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '__form__') {
          if (window.app && window.app.designer) {
            window.app.designer.selectComponent(null);
          }
          this.update(null);
        } else {
          const comp = window.app.designer.form.components.find(c => c.name === val);
          if (comp) {
            window.app.designer.selectComponent(comp);
          }
        }
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchFilter = e.target.value.toLowerCase();
        this.render();
      });
    }

    const tabProps = document.getElementById('oiTabProperties');
    const tabEvents = document.getElementById('oiTabEvents');

    if (tabProps && tabEvents) {
      tabProps.addEventListener('click', () => {
        this.currentTab = 'properties';
        tabProps.classList.add('active');
        tabEvents.classList.remove('active');
        this.render();
      });

      tabEvents.addEventListener('click', () => {
        this.currentTab = 'events';
        tabEvents.classList.add('active');
        tabProps.classList.remove('active');
        this.render();
      });
    }
  }

  update(comp) {
    this.target = comp;
    this.updateSelectorOptions();
    this.render();
  }

  updateSelectorOptions() {
    if (!this.compSelector || !window.app || !window.app.designer) return;

    const form = window.app.designer.form;
    const formClassType = 'TVoxForm';
    const formSelected = !this.target ? 'selected' : '';
    let html = `<option value="__form__" ${formSelected}>${form.name} : ${formClassType}</option>`;

    form.components.forEach(c => {
      const selected = (this.target && this.target.id === c.id) ? 'selected' : '';
      const classType = window.getVoxClassType ? window.getVoxClassType(c.type || c.className) : (c.type || 'TVoxComponent');
      html += `<option value="${c.name}" ${selected}>${c.name} : ${classType}</option>`;
    });

    this.compSelector.innerHTML = html;
  }

  render() {
    if (this.currentTab === 'properties') {
      if (this.propsContainer) this.propsContainer.style.display = 'block';
      if (this.eventsContainer) this.eventsContainer.style.display = 'none';
      this.renderProperties();
    } else {
      if (this.propsContainer) this.propsContainer.style.display = 'none';
      if (this.eventsContainer) this.eventsContainer.style.display = 'block';
      this.renderEvents();
    }
  }

  renderProperties() {
    if (!this.propsContainer) return;

    let propsList = [];

    if (!this.target) {
      const form = window.app.designer.form;
      propsList = [
        { name: 'Name', value: form.name, type: 'text', targetType: 'form', propKey: 'name' },
        { name: 'Caption', value: form.title, type: 'text', targetType: 'form', propKey: 'title' },
        { name: 'Left', value: 0, type: 'number', targetType: 'form', propKey: 'left' },
        { name: 'Top', value: 0, type: 'number', targetType: 'form', propKey: 'top' },
        { name: 'Width', value: form.width, type: 'number', targetType: 'form', propKey: 'width' },
        { name: 'Height', value: form.height, type: 'number', targetType: 'form', propKey: 'height' },
        { name: 'BorderStyle', value: 'bsSizeable', type: 'select', options: ['bsSizeable', 'bsSingle', 'bsDialog', 'bsNone'] },
        { name: 'Color', value: '#f0f2f5', type: 'color' },
        { name: 'Visible', value: true, type: 'boolean' }
      ];
    } else {
      const comp = this.target;

      // Lista de contêineres disponíveis para a propriedade Parent
      const formName = window.app.designer.form.name;
      const availableParents = [formName];
      const isDescendantOf = (ancestorName, checkComp) => {
        let cur = checkComp;
        while (cur && cur.parent && cur.parent !== formName) {
          if (cur.parent === ancestorName) return true;
          cur = window.app.designer.getComponentByName(cur.parent);
        }
        return false;
      };

      if (window.app && window.app.designer) {
        window.app.designer.form.components.forEach(c => {
          if (c.id !== comp.id && window.app.designer.isContainerComponent(c.type)) {
            if (!isDescendantOf(comp.name, c)) {
              availableParents.push(c.name);
            }
          }
        });
      }

      const isTab = (comp.type === 'vox_TabSheet' || comp.type === 'TVoxTabSheet' || comp.type === 'TTabSheet');
      if (isTab) {
        propsList = [
          { name: 'Name', value: comp.name, type: 'text', targetType: 'comp', propKey: 'name' },
          { name: 'Parent', value: comp.parent || formName, type: 'select', options: availableParents, targetType: 'parent', propKey: 'parent' },
          { name: 'Align', value: (comp.props && comp.props.Align) || 'alClient', type: 'select', options: ['alClient', 'alNone', 'alTop', 'alBottom', 'alLeft', 'alRight'], targetType: 'custom', propKey: 'Align' }
        ];
      } else {
        propsList = [
          { name: 'Name', value: comp.name, type: 'text', targetType: 'comp', propKey: 'name' },
          { name: 'Parent', value: comp.parent || formName, type: 'select', options: availableParents, targetType: 'parent', propKey: 'parent' },
          { name: 'Left', value: comp.left, type: 'number', targetType: 'comp', propKey: 'left' },
          { name: 'Top', value: comp.top, type: 'number', targetType: 'comp', propKey: 'top' },
          { name: 'Width', value: comp.width, type: 'number', targetType: 'comp', propKey: 'width' },
          { name: 'Height', value: comp.height, type: 'number', targetType: 'comp', propKey: 'height' },
          { name: 'Align', value: comp.props.Align || 'alNone', type: 'select', options: ['alNone', 'alTop', 'alBottom', 'alLeft', 'alRight', 'alClient'], targetType: 'custom', propKey: 'Align' }
        ];
      }

      Object.entries(comp.props).forEach(([key, val]) => {
        if (key === 'Align') return;

        // Skip duplicate/mirror properties — keep only the English-named ones
        // Portuguese mirrors: IP -> Server, Porta -> Port, Login -> UserName, Senha -> Password
        const skipDuplicates = {
          'IP': 'Server',
          'Porta': 'Port',
          'Login': 'UserName',
          'Senha': 'Password',
          'Driver': 'DriverName',
          'Host': 'Server'
        };
        if (skipDuplicates[key] && comp.props[skipDuplicates[key]] !== undefined) return;

        let type = 'text';
        let options = [];

        if (key === 'SQL') {
          type = 'sql';
        } else if (key === 'DriverName' || key === 'Driver') {
          type = 'select';
          options = ['MySQL', 'MSSQL', 'Firebird', 'SQLite', 'PostgreSQL', 'SQLServer'];
        } else if (key === 'Senha' || key === 'Password') {
          type = 'password';
        } else if (key === 'Porta' || key === 'Port') {
          type = 'number';
        } else if (key === 'VendorLib') {
          type = 'text';
        } else if (key === 'Connection') {
          type = 'select';
          const conns = window.app.designer.form.components.filter(c => c.type === 'vox_Connection' || c.type === 'TVoxConnection' || c.type === 'TFDConnection').map(c => c.name);
          options = ['(None)', ...conns];
        } else if (key === 'DataSet') {
          type = 'select';
          const datasets = window.app.designer.form.components.filter(c => 
            c.type === 'vox_Query' || c.type === 'TVoxQuery' || c.type === 'TFDQuery' ||
            c.type === 'vox_DBTable' || c.type === 'TVoxDBTable' || c.type === 'TDBTable' ||
            c.type === 'vox_Table' || c.type === 'TVoxTable' || c.type === 'TTable' ||
            c.type === 'vox_MemTable' || c.type === 'TVoxMemTable' || c.type === 'TMemTable' ||
            c.type === 'vox_ClientDataSet' || c.type === 'TClientDataSet'
          ).map(c => c.name);
          options = ['(None)', ...datasets];
        } else if (key === 'DataSource' || key === 'LookupSource') {
          type = 'select';
          const dss = window.app.designer.form.components.filter(c => c.type === 'vox_DataSource' || c.type === 'TVoxDataSource' || c.type === 'TDataSource').map(c => c.name);
          options = ['(None)', ...dss];
        } else if (key === 'Kind') {
          type = 'select';
          options = ['bkOK', 'bkCancel', 'bkClose', 'bkHelp', 'bkYes', 'bkNo', 'bkCustom'];
        } else if (key === 'ModalResult') {
          type = 'select';
          options = ['mrNone', 'mrOk', 'mrCancel', 'mrYes', 'mrNo', 'mrAbort', 'mrRetry', 'mrIgnore'];
        } else if (key === 'ViewStyle') {
          type = 'select';
          options = ['vsReport', 'vsIcon', 'vsSmallIcon', 'vsList'];
        } else if (key === 'Method') {
          type = 'select';
          options = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
        } else if (key === 'Layout') {
          type = 'select';
          options = ['Top', 'Left'];
        } else if (key === 'Alignment') {
          type = 'select';
          options = ['taCenter', 'taLeftJustify', 'taRightJustify'];
        } else if (key === 'ActivePageIndex') {
          type = 'select';
          const pages = window.app.designer.form.components.filter(c =>
            (c.type === 'vox_TabSheet' || c.type === 'TVoxTabSheet' || c.type === 'TTabSheet') && c.parent === comp.name
          );
          if (pages.length > 0) {
            options = pages.map((p, idx) => `${idx}`);
          } else {
            options = ['0'];
          }
        } else if (key === 'TabPosition') {
          type = 'select';
          options = ['tpTop', 'tpBottom'];
        } else if (key === 'BevelOuter' || key === 'BevelInner') {
          type = 'select';
          options = ['bvNone', 'bvLowered', 'bvRaised', 'bvSpace'];
        } else if (key === 'BandType') {
          type = 'select';
          options = ['rbTitle', 'rbPageHeader', 'rbColumnHeader', 'rbDetail', 'rbPageFooter', 'rbSummary', 'rbGroupHeader', 'rbGroupFooter'];
        } else if (key === 'PageOrientation') {
          type = 'select';
          options = ['poPortrait', 'poLandscape'];
        } else if (key === 'PageSize') {
          type = 'select';
          options = ['psA4', 'psLetter', 'psLegal'];
        } else if (key === 'SysDataType') {
          type = 'select';
          options = ['sdDate', 'sdTime', 'sdDateTime', 'sdPageNumber', 'sdPageCount', 'sdRecordCount', 'sdReportTitle'];
        } else if (key === 'ShapeType') {
          type = 'select';
          options = ['stHorizontalLine', 'stVerticalLine', 'stRectangle', 'stRoundRect'];
        } else if (key === 'DisplayFormat') {
          type = 'select';
          options = ['(None)', 'Currency (R$ #,##0.00)', 'Number (#,##0.00)', 'Integer (#,##0)', 'Date (DD/MM/YYYY)', 'DateTime (DD/MM/YYYY HH:mm)'];
        } else if (typeof val === 'boolean') {
          type = 'boolean';
        } else if (typeof val === 'number') {
          type = 'number';
        } else if (key.toLowerCase().includes('color')) {
          type = 'color';
        }

        propsList.push({
          name: key,
          value: val,
          type: type,
          targetType: 'custom',
          options: options,
          propKey: key
        });
      });
    }

    // Filtrar pelo campo de busca
    if (this.searchFilter) {
      propsList = propsList.filter(p => p.name.toLowerCase().includes(this.searchFilter));
    }

    let rowsHtml = '';
    propsList.forEach(p => {
      let inputHtml = '';

      if (p.type === 'select') {
        const opts = (p.options || []).map(o => {
          const isSelected = (o === p.value) || (!p.value && o === '(None)');
          return `<option value="${o}" ${isSelected ? 'selected' : ''}>${o}</option>`;
        }).join('');
        inputHtml = `
          <select class="delphi-prop-input" onchange="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)">
            ${opts}
          </select>
        `;
      } else if (p.type === 'boolean') {
        inputHtml = `
          <select class="delphi-prop-input" onchange="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value === 'true')">
            <option value="true" ${p.value ? 'selected' : ''}>True</option>
            <option value="false" ${!p.value ? 'selected' : ''}>False</option>
          </select>
        `;
      } else if (p.type === 'color') {
        inputHtml = `
          <div style="display: flex; align-items: center; gap: 4px;">
            <input type="color" value="${p.value || '#000000'}" style="width: 20px; height: 18px; border: none; padding: 0; cursor: pointer;"
              oninput="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)"
              onchange="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)">
            <input class="delphi-prop-input" value="${p.value || ''}"
              oninput="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)"
              onchange="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)">
          </div>
        `;
      } else if (p.type === 'sql') {
        inputHtml = `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 11px; color: #4cc2ff; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px;">(TStrings)</span>
            <button class="tool-btn" style="height: 18px; padding: 0 4px; font-size: 10px;" onclick="window.app.openSqlEditor(window.app.designer.selectedComponent)">...</button>
          </div>
        `;
      } else if (p.type === 'password') {
        inputHtml = `
          <input type="password" class="delphi-prop-input" value="${p.value || ''}" placeholder="(senha)" autocomplete="new-password" data-lpignore="true"
            onchange="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)">
        `;
      } else {
        inputHtml = `
          <input class="delphi-prop-input" value="${p.value || ''}" onchange="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)">
        `;
      }

      rowsHtml += `
        <tr>
          <td class="prop-col-name" title="${p.name}">${p.name}</td>
          <td class="prop-col-val">${inputHtml}</td>
        </tr>
      `;
    });

    let headerBanner = '';
    if (this.target && (this.target.type === 'vox_Connection' || this.target.type === 'TVoxConnection' || this.target.type === 'TFDConnection')) {
      headerBanner = `
        <div style="padding: 6px 8px; background: rgba(0, 120, 212, 0.15); border-bottom: 1px solid #0078d4; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; color: #38bdf8;">🔌 TVoxConnection</span>
          <button class="tool-btn btn-run-delphi" style="padding: 2px 8px; font-size: 10.5px;" onclick="window.app.openConnectionEditor('${this.target.id}')">⚙️ Configurar...</button>
        </div>
      `;
    }

    const publishedBadge = `
      <div style="padding: 4px 8px; background: rgba(56, 189, 248, 0.08); font-size: 10px; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
        <span>Seção: <span style="color: #38bdf8; font-weight: 600; font-family: monospace;">published:</span></span>
        <span style="font-size: 9.5px; color: #a1a1aa; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px;" title="Propriedades publicadas no Object Inspector">RTTI Published</span>
      </div>
    `;

    let actionsHtml = '';
    const isPageControl = this.target && (this.target.type === 'vox_PageControl' || this.target.type === 'TVoxPageControl' || this.target.type === 'TPageControl');
    const isTabSheet = this.target && (this.target.type === 'vox_TabSheet' || this.target.type === 'TVoxTabSheet' || this.target.type === 'TTabSheet');

    if (isPageControl) {
      actionsHtml = `
        <div style="padding: 6px 8px; background: rgba(0, 120, 212, 0.1); border-bottom: 1px solid rgba(0, 120, 212, 0.2); display: flex; gap: 6px;">
          <button class="tool-btn" style="flex: 1; padding: 4px; font-size: 11px; background: #0078d4; color: #ffffff; border-radius: 3px; cursor: pointer; border: none;" onclick="window.app.designer.addTabSheet()">
            📄 + Nova Página (TabSheet)
          </button>
        </div>
      `;
    } else if (isTabSheet && this.target.parent) {
      const pcName = this.target.parent;
      actionsHtml = `
        <div style="padding: 5px 8px; background: rgba(56, 189, 248, 0.1); border-bottom: 1px solid rgba(56, 189, 248, 0.2); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #38bdf8;">📑 Aba de <strong>${pcName}</strong></span>
          <button class="tool-btn" style="padding: 2px 8px; font-size: 10.5px; background: #094771; border: 1px solid #0078d4; color: #ffffff; border-radius: 3px; cursor: pointer;"
            onclick="window.app.designer.selectComponent(window.app.designer.getComponentByName('${pcName}'))"
            title="Selecionar o PageControl pai">
            ⇡ Selecionar ${pcName}
          </button>
        </div>
      `;
    }

    this.propsContainer.innerHTML = `${headerBanner}${publishedBadge}${actionsHtml}<table class="delphi-prop-grid">${rowsHtml}</table>`;
  }

  renderEvents() {
    if (!this.eventsContainer) return;

    // Se nenhum componente está selecionado, exibe os 10 EVENTOS OFICIAIS DO FORM DELPHI!
    if (!this.target) {
      const form = window.app.designer.form;
      const formEvents = [
        'OnCreate', 'OnShow', 'OnClose', 'OnCloseQuery', 'OnDestroy',
        'OnActivate', 'OnDeactivate', 'OnResize', 'OnClick', 'OnKeyDown'
      ];

      let rowsHtml = `
        <tr style="background: #191f28; font-weight: 600; font-size: 10px; color: #38bdf8;">
          <td colspan="2" style="padding: 4px 6px;">Eventos do Formulário (${form.name})</td>
        </tr>
      `;

      formEvents.forEach(evName => {
        if (this.searchFilter && !evName.toLowerCase().includes(this.searchFilter.toLowerCase())) return;
        const handler = (form.events && form.events[evName]) ? form.events[evName] : '';
        const defaultHandler = `${form.name}_${evName}`;

        rowsHtml += `
          <tr ondblclick="window.app.jumpToFormEvent('${evName}')">
            <td class="prop-col-name" style="color: #4cc2ff; cursor: pointer;" title="Duplo-clique para abrir o código">${evName}</td>
            <td class="prop-col-val" style="display: flex; align-items: center;">
              <input class="delphi-prop-input" value="${handler}" placeholder="(${defaultHandler})"
                onchange="window.app.inspector.onFormEventChange('${evName}', this.value)">
              <button class="tool-btn" style="height: 18px; padding: 0 4px; font-size: 10px;"
                title="Abrir no Código Vox"
                onclick="window.app.jumpToFormEvent('${evName}')">⚙</button>
            </td>
          </tr>
        `;
      });

      const publishedBadge = `
        <div style="padding: 4px 8px; background: rgba(56, 189, 248, 0.08); font-size: 10px; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
          <span>Seção: <span style="color: #38bdf8; font-weight: 600; font-family: monospace;">published:</span></span>
          <span style="font-size: 9.5px; color: #a1a1aa; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px;" title="Eventos publicados para o Object Inspector">RTTI Eventos</span>
        </div>
      `;

      this.eventsContainer.innerHTML = `${publishedBadge}<table class="delphi-prop-grid">${rowsHtml}</table>`;
      return;
    }

    const comp = this.target;
    const meta = window.VOX_COMPONENTS ? window.VOX_COMPONENTS[comp.type] : null;
    const isMenuComp = [
      'vox_MainMenu', 'TMainMenu', 'TVoxMainMenu',
      'vox_PopupMenu', 'TPopupMenu', 'TVoxPopupMenu'
    ].includes(comp.type);

    let rowsHtml = '';

    if (isMenuComp) {
      const defaultItemsStr = comp.type.includes('Popup')
        ? 'Copiar, Colar, Excluir, Propriedades'
        : 'Cadastros, Vendas, Relatórios, Configurações';
      const rawItems = (comp.props && comp.props.Items !== undefined) ? comp.props.Items : defaultItemsStr;
      const menuItems = (rawItems || '').split(',').map(i => i.trim()).filter(Boolean);

      rowsHtml += `
        <tr style="background: #191f28; font-weight: 600; font-size: 10px; color: #38bdf8;">
          <td colspan="2" style="padding: 4px 6px;">Opções do Menu - OnClick (${comp.name})</td>
        </tr>
      `;

      menuItems.forEach((item) => {
        const cleanItem = item.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
        const evKey = `OnClick_${cleanItem}`;
        const displayLabel = `OnClick (${item})`;

        if (this.searchFilter) {
          const filter = this.searchFilter.toLowerCase();
          if (!displayLabel.toLowerCase().includes(filter) && !evKey.toLowerCase().includes(filter)) {
            return;
          }
        }

        const handler = (comp.events && (comp.events[evKey] || comp.events[item])) ? (comp.events[evKey] || comp.events[item]) : '';
        const defaultHandler = `${comp.name}_${cleanItem}Click`;
        const escapedItem = item.replace(/'/g, "\\'");

        rowsHtml += `
          <tr ondblclick="window.app.jumpToEvent(window.app.designer.selectedComponent, '${evKey}', '${cleanItem}', '${escapedItem}')">
            <td class="prop-col-name" style="color: #4cc2ff; cursor: pointer;" title="Opção de Menu: '${item}' — Duplo-clique para abrir o código">${displayLabel}</td>
            <td class="prop-col-val" style="display: flex; align-items: center;">
              <input class="delphi-prop-input" value="${handler}" placeholder="(${defaultHandler})"
                onchange="window.app.inspector.onEventChange('${evKey}', this.value)">
              <button class="tool-btn" style="height: 18px; padding: 0 4px; font-size: 10px;"
                title="Abrir no Código Vox"
                onclick="window.app.jumpToEvent(window.app.designer.selectedComponent, '${evKey}', '${cleanItem}', '${escapedItem}')">⚙</button>
            </td>
          </tr>
        `;
      });

      const generalEvents = (meta && meta.events && meta.events.length > 0)
        ? meta.events
        : ['OnItemClick', 'OnToggleCollapse'];

      rowsHtml += `
        <tr style="background: #191f28; font-weight: 600; font-size: 10px; color: #38bdf8; border-top: 1px solid rgba(255,255,255,0.08);">
          <td colspan="2" style="padding: 4px 6px;">Eventos Gerais (${comp.name})</td>
        </tr>
      `;

      generalEvents.forEach(evName => {
        if (this.searchFilter && !evName.toLowerCase().includes(this.searchFilter.toLowerCase())) return;
        const handler = (comp.events && comp.events[evName]) ? comp.events[evName] : '';
        const defaultHandler = `${comp.name}_${evName}`;

        rowsHtml += `
          <tr ondblclick="window.app.jumpToEvent(window.app.designer.selectedComponent, '${evName}')">
            <td class="prop-col-name" style="color: #4cc2ff; cursor: pointer;" title="Duplo-clique para abrir o código">${evName}</td>
            <td class="prop-col-val" style="display: flex; align-items: center;">
              <input class="delphi-prop-input" value="${handler}" placeholder="(${defaultHandler})"
                onchange="window.app.inspector.onEventChange('${evName}', this.value)">
              <button class="tool-btn" style="height: 18px; padding: 0 4px; font-size: 10px;"
                title="Abrir no Código Vox"
                onclick="window.app.jumpToEvent(window.app.designer.selectedComponent, '${evName}')">⚙</button>
            </td>
          </tr>
        `;
      });
    } else {
      const eventsList = (meta && meta.events && meta.events.length > 0)
        ? meta.events
        : ['OnClick', 'OnDblClick', 'OnChange', 'OnEnter', 'OnExit', 'OnKeyDown', 'OnKeyUp'];

      rowsHtml += `
        <tr style="background: #191f28; font-weight: 600; font-size: 10px; color: #38bdf8;">
          <td colspan="2" style="padding: 4px 6px;">Eventos do Componente (${comp.name})</td>
        </tr>
      `;

      eventsList.forEach(evName => {
        if (this.searchFilter && !evName.toLowerCase().includes(this.searchFilter.toLowerCase())) return;
        const handler = (comp.events && comp.events[evName]) ? comp.events[evName] : '';
        const defaultHandler = `${comp.name}_${evName}`;

        rowsHtml += `
          <tr ondblclick="window.app.jumpToEvent(window.app.designer.selectedComponent, '${evName}')">
            <td class="prop-col-name" style="color: #4cc2ff; cursor: pointer;" title="Duplo-clique para abrir o código">${evName}</td>
            <td class="prop-col-val" style="display: flex; align-items: center;">
              <input class="delphi-prop-input" value="${handler}" placeholder="(${defaultHandler})"
                onchange="window.app.inspector.onEventChange('${evName}', this.value)">
              <button class="tool-btn" style="height: 18px; padding: 0 4px; font-size: 10px;"
                title="Abrir no Código Vox"
                onclick="window.app.jumpToEvent(window.app.designer.selectedComponent, '${evName}')">⚙</button>
            </td>
          </tr>
        `;
      });
    }

    const publishedBadge = `
      <div style="padding: 4px 8px; background: rgba(56, 189, 248, 0.08); font-size: 10px; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
        <span>Seção: <span style="color: #38bdf8; font-weight: 600; font-family: monospace;">published:</span></span>
        <span style="font-size: 9.5px; color: #a1a1aa; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px;" title="Eventos publicados para o Object Inspector">RTTI Eventos</span>
      </div>
    `;

    this.eventsContainer.innerHTML = `${publishedBadge}<table class="delphi-prop-grid">${rowsHtml}</table>`;
  }

  onPropChange(type, key, value) {
    if (type === 'parent') {
      if (this.target && window.app && window.app.designer) {
        window.app.designer.reparentComponent(this.target, value);
        this.update(this.target);
      }
      return;
    } else if (type === 'form') {
      const k = key.toLowerCase();
      if (k === 'width' || k === 'height' || k === 'left' || k === 'top') {
        value = parseInt(value, 10) || 0;
      }
      window.app.designer.form[k] = value;
      if (k === 'name') {
        window.app.designer.form.name = value;
      }
      if (k === 'title') {
        window.app.designer.form.title = value;
      }
      window.app.designer.renderForm();
      if (window.app) window.app.onFormChanged();
    } else if (type === 'comp') {
      if (this.target) {
        this.target[key] = value;
        window.app.designer.updateComponentElement(this.target);
        if (['left', 'top', 'width', 'height'].includes(key)) {
          window.app.designer.recalculateAlignments(false);
          if (window.app) window.app.onFormChanged();
        }
      }
    } else if (type === 'custom') {
      if (this.target) {
        if (!this.target.props) this.target.props = {};

        if (key === 'Align') {
          const oldAlign = this.target.props ? this.target.props.Align : undefined;
          this.target.props.Align = value;

          // Se for TabSheet, aplica também no PageControl pai para atender à expectativa direta do usuário!
          const isTab = (this.target.type === 'vox_TabSheet' || this.target.type === 'TVoxTabSheet' || this.target.type === 'TTabSheet');
          if (isTab && this.target.parent && window.app && window.app.designer) {
            const parentPc = window.app.designer.getComponentByName(this.target.parent);
            if (parentPc) {
              if (!parentPc.props) parentPc.props = {};
              parentPc.props.Align = value;
              window.app.designer.recalculateAlignments(true);
              window.app.designer.updateComponentElement(parentPc);
              window.app.showToast(`📐 Alinhamento "${value}" aplicado ao PageControl (${parentPc.name})!`);
              window.app.onFormChanged();
              this.render();
              return;
            }
          }

          if (window.app && window.app.designer) {
            if (value !== 'alNone' && (!oldAlign || oldAlign === 'alNone')) {
              this.target._origWidth = this.target.width;
              this.target._origHeight = this.target.height;
              this.target._origLeft = this.target.left;
              this.target._origTop = this.target.top;
            } else if (value === 'alNone' && oldAlign && oldAlign !== 'alNone') {
              const meta = window.VOX_COMPONENTS[this.target.type];
              this.target.width = this.target._origWidth || (meta ? meta.defaultWidth : 200);
              this.target.height = this.target._origHeight || (meta ? meta.defaultHeight : 120);
              this.target.left = this.target._origLeft !== undefined ? this.target._origLeft : 20;
              this.target.top = this.target._origTop !== undefined ? this.target._origTop : 20;
            } else if ((value === 'alTop' || value === 'alBottom') && (oldAlign === 'alClient' || oldAlign === 'alLeft' || oldAlign === 'alRight')) {
              const meta = window.VOX_COMPONENTS[this.target.type];
              this.target.height = this.target._origHeight || (meta ? meta.defaultHeight : 180);
            } else if ((value === 'alLeft' || value === 'alRight') && (oldAlign === 'alClient' || oldAlign === 'alTop' || oldAlign === 'alBottom')) {
              const meta = window.VOX_COMPONENTS[this.target.type];
              this.target.width = this.target._origWidth || (meta ? meta.defaultWidth : 200);
            }
            window.app.designer.recalculateAlignments(true);
            window.app.designer.updateComponentElement(this.target);
            window.app.onFormChanged();
          }
          this.render();
          return;
        }

        if (key === 'DataSource' || key === 'DataSet') {
          if (value === '(None)') value = '';
          this.target.props[key] = value;
          if (window.app && window.app.designer) {
            window.app.designer.renderForm();
            window.app.onFormChanged();
          }
          this.render();
          return;
        }

        this.target.props[key] = value;
        if (key === 'Alignment') {
          this.target.props[key] = value;
          if (window.app && window.app.designer) {
            window.app.designer.updateComponentElement(this.target);
            window.app.onFormChanged();
          }
          this.render();
          return;
        }
        if (this.target.type === 'vox_MainMenu' && key === 'Layout') {
          const form = window.app.designer.form;
          if (value === 'Left') {
            this.target.left = 0;
            this.target.top = 0;
            this.target.width = 180;
            this.target.height = form.height;
          } else {
            this.target.left = 0;
            this.target.top = 0;
            this.target.width = form.width;
            this.target.height = 40;
          }
          window.app.designer.updateComponentElement(this.target);
          this.render();
          return;
        } else if (this.target.type === 'vox_Connection' || this.target.type === 'TFDConnection') {
          if (key === 'DriverName' || key === 'Driver') {
            if (value === 'MySQL') {
              this.target.props.Port = 3306;
              this.target.props.UserName = 'root';
              this.target.props.Password = '';
              this.target.props.VendorLib = 'libmysql.dll';
              if (!this.target.props.Database || this.target.props.Database.includes('.fdb') || this.target.props.Database.includes('.db')) {
                this.target.props.Database = 'loja_vox';
              }
            } else if (value === 'MSSQL' || value === 'SQLServer') {
              this.target.props.Port = 1433;
              this.target.props.UserName = 'sa';
              this.target.props.Password = '';
              this.target.props.VendorLib = 'sqlncli11.dll';
              if (!this.target.props.Database || this.target.props.Database.includes('.fdb') || this.target.props.Database.includes('.db')) {
                this.target.props.Database = 'master';
              }
            } else if (value === 'Firebird') {
              this.target.props.Port = 3050;
              this.target.props.UserName = 'SYSDBA';
              this.target.props.Password = 'masterkey';
              this.target.props.VendorLib = 'fbclient.dll';
              if (!this.target.props.Database || !this.target.props.Database.includes('.fdb')) {
                this.target.props.Database = 'C:\\dados\\banco.fdb';
              }
            } else if (value === 'PostgreSQL') {
              this.target.props.Port = 5432;
              this.target.props.UserName = 'postgres';
              this.target.props.Password = '';
              this.target.props.VendorLib = 'libpq.dll';
              this.target.props.Database = 'postgres';
            } else if (value === 'SQLite') {
              this.target.props.Port = 0;
              this.target.props.UserName = '';
              this.target.props.Password = '';
              this.target.props.VendorLib = 'sqlite3.dll';
              this.target.props.Database = 'clientes.db';
            }

            // Remove any legacy Portuguese-named duplicates
            delete this.target.props.IP;
            delete this.target.props.Porta;
            delete this.target.props.Login;
            delete this.target.props.Senha;
            delete this.target.props.Driver;
            delete this.target.props.Host;

            this.render();
          }

          if (key === 'ActivePageIndex') {
            const pageIdx = parseInt(value, 10) || 0;
            this.target.props.ActivePageIndex = pageIdx;
            if (window.app && window.app.designer) {
              window.app.designer.renderForm();
              window.app.onFormChanged();
              window.app.updateStructureTree();
            }
            this.render();
            return;
          }

          if (key === 'TabPosition') {
            this.target.props.TabPosition = value;
            if (window.app && window.app.designer) {
              window.app.designer.renderForm();
              window.app.onFormChanged();
            }
            this.render();
            return;
          }

          if (key === 'Caption' && (this.target.type === 'vox_TabSheet' || this.target.type === 'TTabSheet')) {
            this.target.props.Caption = value;
            if (window.app && window.app.designer) {
              window.app.designer.updateComponentElement(this.target);
              window.app.onFormChanged();
              window.app.updateStructureTree();
            }
            this.render();
            return;
          }

          window.app.designer.updateComponentElement(this.target);
        } else {
          window.app.designer.updateComponentElement(this.target);
        }
      }
    }

    if (window.app) {
      window.app.onFormChanged();
      window.app.updateStructureTree();
    }
  }

  onEventChange(eventName, handlerName) {
    if (!this.target) return;
    if (!this.target.events) this.target.events = {};
    this.target.events[eventName] = handlerName.trim();
    if (window.app) window.app.onFormChanged();
  }

  onFormEventChange(eventName, handlerName) {
    if (!window.app || !window.app.designer || !window.app.designer.form) return;
    if (!window.app.designer.form.events) window.app.designer.form.events = {};
    window.app.designer.form.events[eventName] = handlerName.trim();
    window.app.onFormChanged();
  }
}

window.VoxObjectInspector = VoxObjectInspector;
