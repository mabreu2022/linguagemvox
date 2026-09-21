; ==============================================================================
; Inno Setup Script: Vox Studio RAD (IDE Visual Delphi-Like)
; Versão: 0.7.0
; ==============================================================================

#define MyAppName "Vox Studio RAD"
#define MyAppVersion "0.7.0"
#define MyAppPublisher "Vox Studio RAD Team"
#define MyAppURL "https://github.com/mabreu2022/linguagemvox"
#define MyAppExeName "VoxStudioRAD.exe"

[Setup]
AppId={{9B72C614-884A-4D71-BF31-2C5E784F3D67}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\VoxStudioRAD
DefaultGroupName=Vox Studio RAD
AllowNoIcons=yes
OutputDir=d:\Projetos AntiGravity\linguagem\installers\dist
OutputBaseFilename=Vox_Studio_RAD_Setup_v0.7.0
SetupIconFile=d:\Projetos AntiGravity\linguagem\installers\assets\vox_studio.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequiredOverridesAllowed=dialog
ChangesAssociations=yes
DisableProgramGroupPage=auto

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "associateprojects"; Description: "Associar arquivos de projeto (.voxProj) ao Vox Studio RAD"; GroupDescription: "Associações de Arquivo:"
Name: "associateforms"; Description: "Associar arquivos de formulário (.vxf) ao Vox Studio RAD"; GroupDescription: "Associações de Arquivo:"

[Files]
; Launcher Executável Nativo Windows
Source: "d:\Projetos AntiGravity\linguagem\installers\launcher\VoxStudioRAD.exe"; DestDir: "{app}"; Flags: ignoreversion

; Ícones Oficiais
Source: "d:\Projetos AntiGravity\linguagem\installers\assets\vox_studio.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

; Servidor Backend e Interface Web RAD
Source: "d:\Projetos AntiGravity\linguagem\tools\vox-rad\*"; DestDir: "{app}\tools\vox-rad"; Flags: ignoreversion recursesubdirs createallsubdirs

; Núcleo do Compilador Vox (Necessário para Build Web e Validação)
Source: "d:\Projetos AntiGravity\linguagem\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Cabeçalhos C para Geração de Código
Source: "d:\Projetos AntiGravity\linguagem\src\codegen\vox_runtime.h"; DestDir: "{app}\src\codegen"; Flags: ignoreversion

; Templates de Projetos (Calculadora, PDV, ERP, Relatórios, etc.)
Source: "d:\Projetos AntiGravity\linguagem\templates\*"; DestDir: "{app}\templates"; Flags: ignoreversion recursesubdirs createallsubdirs

; Documentação e Manuais Oficiais da IDE
Source: "d:\Projetos AntiGravity\linguagem\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs createallsubdirs

; Arquivo de Configuração e Dependências
Source: "d:\Projetos AntiGravity\linguagem\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "d:\Projetos AntiGravity\linguagem\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".bin,ts-node,typescript,jest,@types"

[Icons]
Name: "{group}\Vox Studio RAD"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\vox_studio.ico"
Name: "{group}\Manual Oficial da IDE (HTML)"; Filename: "{app}\docs\manual_ide.html"; IconFilename: "{app}\assets\vox_studio.ico"
Name: "{group}\{cm:UninstallProgram,Vox Studio RAD}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Vox Studio RAD"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\assets\vox_studio.ico"; Tasks: desktopicon

[Registry]
; Associação de Arquivos de Projeto .voxProj
Root: HKA; Subkey: "Software\Classes\.voxProj"; ValueType: string; ValueName: ""; ValueData: "VoxProjectFile"; Flags: uninsdeletevalue; Tasks: associateprojects
Root: HKA; Subkey: "Software\Classes\VoxProjectFile"; ValueType: string; ValueName: ""; ValueData: "Projeto Vox Studio RAD"; Flags: uninsdeletekey; Tasks: associateprojects
Root: HKA; Subkey: "Software\Classes\VoxProjectFile\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\assets\vox_studio.ico,0"; Tasks: associateprojects
Root: HKA; Subkey: "Software\Classes\VoxProjectFile\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Tasks: associateprojects

; Associação de Arquivos de Formulário .vxf
Root: HKA; Subkey: "Software\Classes\.vxf"; ValueType: string; ValueName: ""; ValueData: "VoxFormFile"; Flags: uninsdeletevalue; Tasks: associateforms
Root: HKA; Subkey: "Software\Classes\VoxFormFile"; ValueType: string; ValueName: ""; ValueData: "Formulário Visual Vox (VXF)"; Flags: uninsdeletekey; Tasks: associateforms
Root: HKA; Subkey: "Software\Classes\VoxFormFile\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\assets\vox_studio.ico,0"; Tasks: associateforms
Root: HKA; Subkey: "Software\Classes\VoxFormFile\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Tasks: associateforms

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,Vox Studio RAD}"; Flags: nowait postinstall skipifsilent
