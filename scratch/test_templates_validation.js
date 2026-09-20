// Test script to verify that all VOX_TEMPLATES can be loaded and code generated without errors
const fs = require('fs');
const path = require('path');

// Mock window and browser globals
global.window = {};
global.document = {
  getElementById: () => null,
  createElement: () => ({ classList: { add: () => {}, remove: () => {} }, style: {} }),
  querySelector: () => null
};

// Load templates.js
const templatesCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/templates.js'), 'utf8');
eval(templatesCode);

// Load codegen.js
const codegenCode = fs.readFileSync(path.join(__dirname, '../tools/vox-rad/public/js/codegen.js'), 'utf8');
eval(codegenCode);

console.log('Templates available in VOX_TEMPLATES:', Object.keys(window.VOX_TEMPLATES));

let hasErrors = false;
for (const [key, tmpl] of Object.entries(window.VOX_TEMPLATES)) {
  console.log(`\nTesting template [${key}] - Name: ${tmpl.name}, Title: ${tmpl.title}, Components: ${tmpl.components ? tmpl.components.length : 0}`);
  if (!tmpl.components || tmpl.components.length === 0) {
    console.error(`ERROR: Template ${key} has no components!`);
    hasErrors = true;
  }
  try {
    const voxCode = window.VoxCodeGen.generateVoxCode(tmpl);
    if (!voxCode || voxCode.length < 50) {
      console.error(`ERROR: Generated code for ${key} is too short or empty!`);
      hasErrors = true;
    } else {
      console.log(`SUCCESS: Code generated (${voxCode.length} chars)`);
    }
  } catch (err) {
    console.error(`ERROR generating code for ${key}:`, err);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\nFAIL: Some templates failed validation!');
  process.exit(1);
} else {
  console.log('\nPASS: All templates validated successfully!');
  process.exit(0);
}
