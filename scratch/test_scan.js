const fs = require('fs');
const path = require('path');

const WORKSPACE_DIR = path.resolve(__dirname, '..');

function scanWorkspace() {
  const units = [];
  const projects = [];
  const groups = [];

  const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.gemini', 'brain', 'scratch', '.system_generated']);

  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      const relPath = path.relative(WORKSPACE_DIR, fullPath).replace(/\\/g, '/');

      if (ent.isDirectory()) {
        if (ignoredDirs.has(ent.name)) continue;

        // Check if directory itself is a project folder (e.g. inside projetos/ or clientes/)
        if (relPath.startsWith('projetos/') && relPath.split('/').length === 2) {
          projects.push({
            name: ent.name,
            folder: relPath,
            file: `${relPath}/${ent.name}.dproj`,
            type: 'dproj'
          });
        }
        walk(fullPath);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        const base = path.basename(ent.name, ext);

        if (ext === '.vox' || ext === '.vxf') {
          let category = 'Unit';
          if (relPath.includes('controller')) category = 'Controller';
          else if (relPath.includes('model')) category = 'Model';
          else if (relPath.includes('view') || ext === '.vxf') category = 'View / Form';
          else if (relPath.includes('example')) category = 'Exemplo';
          else if (base.startsWith('Form') || fs.existsSync(fullPath.replace(/\.vox$/, '.vxf'))) category = 'Form Unit';

          units.push({
            name: ent.name,
            baseName: base,
            relPath,
            ext,
            category,
            size: fs.statSync(fullPath).size
          });
        } else if (ext === '.dproj' || ext === '.vproj') {
          projects.push({
            name: base,
            folder: path.dirname(relPath),
            file: relPath,
            type: ext.slice(1)
          });
        } else if (ext === '.groupproj' || ext === '.vgroup') {
          groups.push({
            name: base,
            file: relPath,
            type: ext.slice(1)
          });
        }
      }
    }
  }

  walk(WORKSPACE_DIR);

  // Add standard/built-in projects and groups if not present
  if (projects.length === 0 || !projects.some(p => p.name.includes('ERP'))) {
    projects.unshift({
      name: 'VoxERP_Comercial',
      folder: 'projetos/VoxERP_Comercial',
      file: 'projetos/VoxERP_Comercial/VoxERP_Comercial.dproj',
      type: 'dproj',
      description: 'ERP Comercial MVC Completo (NF-e, Produtos, PDV)'
    });
  }
  if (!projects.some(p => p.name.includes('Clientes'))) {
    projects.push({
      name: 'Projeto_Clientes',
      folder: 'clientes',
      file: 'clientes/Projeto_Clientes.dproj',
      type: 'dproj',
      description: 'Cadastro de Clientes SQLite MVC'
    });
  }

  if (groups.length === 0) {
    groups.push({
      name: 'ProjectGroup1',
      file: 'ProjectGroup1.groupproj',
      type: 'groupproj',
      projects: ['VoxERP_Comercial.dproj', 'Projeto_Clientes.dproj']
    });
    groups.push({
      name: 'EnterpriseSuite',
      file: 'EnterpriseSuite.groupproj',
      type: 'groupproj',
      projects: ['VoxERP_Comercial.dproj', 'PDV_FrenteDeCaixa.dproj']
    });
  }

  return { units, projects, groups };
}

const res = scanWorkspace();
console.log(`Units found: ${res.units.length}`);
console.log(`Projects found: ${res.projects.length}`);
console.log(`Groups found: ${res.groups.length}`);
console.log('Sample units:', res.units.slice(0, 5));
console.log('Projects:', res.projects);
console.log('Groups:', res.groups);
