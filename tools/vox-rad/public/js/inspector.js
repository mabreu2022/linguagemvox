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
    let html = `<option value="__form__">${form.name} T${form.name}</option>`;

    form.components.forEach(c => {
      const selected = (this.target && this.target.id === c.id) ? 'selected' : '';
      html += `<option value="${c.name}" ${selected}>${c.name} ${c.type}</option>`;
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
      propsList = [
        { name: 'Name', value: comp.name, type: 'text', targetType: 'comp', propKey: 'name' },
        { name: 'Left', value: comp.left, type: 'number', targetType: 'comp', propKey: 'left' },
        { name: 'Top', value: comp.top, type: 'number', targetType: 'comp', propKey: 'top' },
        { name: 'Width', value: comp.width, type: 'number', targetType: 'comp', propKey: 'width' },
        { name: 'Height', value: comp.height, type: 'number', targetType: 'comp', propKey: 'height' },
        { name: 'Align', value: comp.props.Align || 'alNone', type: 'select', options: ['alNone', 'alTop', 'alBottom', 'alLeft', 'alRight', 'alClient'], targetType: 'custom', propKey: 'Align' }
      ];

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
          const conns = window.app.designer.form.components.filter(c => c.type === 'vox_Connection' || c.type === 'TFDConnection').map(c => c.name);
          options = conns.length > 0 ? conns : [val || 'vox_Connection1'];
        } else if (key === 'DataSet') {
          type = 'select';
          const qrys = window.app.designer.form.components.filter(c => c.type === 'vox_Query' || c.type === 'TFDQuery').map(c => c.name);
          options = qrys.length > 0 ? qrys : [val || 'vox_Query1'];
        } else if (key === 'DataSource') {
          type = 'select';
          const dss = window.app.designer.form.components.filter(c => c.type === 'vox_DataSource' || c.type === 'TDataSource').map(c => c.name);
          options = dss.length > 0 ? dss : [val || 'vox_DataSource1'];
        } else if (key === 'Layout') {
          type = 'select';
          options = ['Top', 'Left'];
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
        const opts = (p.options || []).map(o => `<option value="${o}" ${o === p.value ? 'selected' : ''}>${o}</option>`).join('');
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
              onchange="window.app.inspector.onPropChange('${p.targetType}', '${p.propKey || p.name}', this.value)">
            <input class="delphi-prop-input" value="${p.value || ''}"
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
    if (this.target && (this.target.type === 'vox_Connection' || this.target.type === 'TFDConnection')) {
      headerBanner = `
        <div style="padding: 6px 8px; background: rgba(0, 120, 212, 0.15); border-bottom: 1px solid #0078d4; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; color: #38bdf8;">🔌 FireDAC Connection</span>
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

    this.propsContainer.innerHTML = `${headerBanner}${publishedBadge}<table class="delphi-prop-grid">${rowsHtml}</table>`;
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
    const eventsList = (meta && meta.events && meta.events.length > 0)
      ? meta.events
      : ['OnClick', 'OnDblClick', 'OnChange', 'OnEnter', 'OnExit', 'OnKeyDown', 'OnKeyUp'];

    let rowsHtml = `
      <tr style="background: #191f28; font-weight: 600; font-size: 10px; color: #38bdf8;">
        <td colspan="2" style="padding: 4px 6px;">Eventos do Componente (${comp.name})</td>
      </tr>
    `;

    eventsList.forEach(evName => {
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

    const publishedBadge = `
      <div style="padding: 4px 8px; background: rgba(56, 189, 248, 0.08); font-size: 10px; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
        <span>Seção: <span style="color: #38bdf8; font-weight: 600; font-family: monospace;">published:</span></span>
        <span style="font-size: 9.5px; color: #a1a1aa; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 3px;" title="Eventos publicados para o Object Inspector">RTTI Eventos</span>
      </div>
    `;

    this.eventsContainer.innerHTML = `${publishedBadge}<table class="delphi-prop-grid">${rowsHtml}</table>`;
  }

  onPropChange(type, key, value) {
    if (type === 'form') {
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
        this.target.props[key] = value;
        if (key === 'Align') {
          if (window.app && window.app.designer) {
            window.app.designer.recalculateAlignments(false);
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
