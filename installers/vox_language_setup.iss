; ==============================================================================
; Inno Setup Script: Compilador & Ferramentas da Linguagem Vox
; Versão: 1.1.0
; ==============================================================================

#define MyAppName "Vox Programming Language"
#define MyAppVersion "1.1.0"
#define MyAppPublisher "Vox Language Team"
#define MyAppURL "https://github.com/mabreu2022/linguagemvox"
#define MyAppExeName "vox.exe"

[Setup]
AppId={{5E4A8D91-34F2-411B-94E5-B9A34778C210}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\VoxLanguage
DefaultGroupName=Vox Language
AllowNoIcons=yes
OutputDir=d:\Projetos AntiGravity\linguagem\installers\dist
OutputBaseFilename=Vox_Language_Setup_v1.1.0
SetupIconFile=d:\Projetos AntiGravity\linguagem\installers\assets\vox_lang.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequiredOverridesAllowed=dialog
ChangesEnvironment=yes
ChangesAssociations=yes
DisableProgramGroupPage=auto

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "addtopath"; Description: "Adicionar Vox ao PATH do sistema (Recomendado)"; GroupDescription: "Configurações de Ambiente:"
Name: "associatefiles"; Description: "Associar arquivos de código fonte (.vox) ao Compilador Vox"; GroupDescription: "Associações de Arquivo:"

[Files]
; Binários Executáveis do Compilador (vox.exe e kael.exe)
Source: "d:\Projetos AntiGravity\linguagem\installers\launcher\vox.exe"; DestDir: "{app}\bin"; Flags: ignoreversion
Source: "d:\Projetos AntiGravity\linguagem\installers\launcher\kael.exe"; DestDir: "{app}\bin"; Flags: ignoreversion

; Ícones
Source: "d:\Projetos AntiGravity\linguagem\installers\assets\vox_lang.ico"; DestDir: "{app}\assets"; Flags: ignoreversion

; Compilador e Módulos Transpilados (dist)
Source: "d:\Projetos AntiGravity\linguagem\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Cabeçalhos C de Runtime para Compilação Nativa
Source: "d:\Projetos AntiGravity\linguagem\src\codegen\vox_runtime.h"; DestDir: "{app}\src\codegen"; Flags: ignoreversion

; Arquivo de Configuração de Pacote
Source: "d:\Projetos AntiGravity\linguagem\package.json"; DestDir: "{app}"; Flags: ignoreversion

; Módulos de Dependência (Node Modules)
Source: "d:\Projetos AntiGravity\linguagem\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: ".bin,ts-node,typescript,jest,@types"

; Exemplos de Código Fonte
Source: "d:\Projetos AntiGravity\linguagem\examples\*"; DestDir: "{app}\examples"; Flags: ignoreversion recursesubdirs createallsubdirs

; Documentação Oficial
Source: "d:\Projetos AntiGravity\linguagem\docs\LANGUAGE_SPEC.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "d:\Projetos AntiGravity\linguagem\docs\TUTORIAL.md"; DestDir: "{app}\docs"; Flags: ignoreversion
Source: "d:\Projetos AntiGravity\linguagem\docs\livro_vox.html"; DestDir: "{app}\docs"; Flags: ignoreversion

[Icons]
Name: "{group}\Vox CLI Terminal"; Filename: "cmd.exe"; Parameters: "/k vox help"; WorkingDir: "{app}\examples"; IconFilename: "{app}\assets\vox_lang.ico"
Name: "{group}\Manual da Linguagem Vox"; Filename: "{app}\docs\livro_vox.html"; IconFilename: "{app}\assets\vox_lang.ico"
Name: "{group}\Exemplos da Linguagem"; Filename: "{app}\examples"
Name: "{group}\{cm:UninstallProgram,Vox Language}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Vox CLI Terminal"; Filename: "cmd.exe"; Parameters: "/k vox help"; WorkingDir: "{app}\examples"; IconFilename: "{app}\assets\vox_lang.ico"; Tasks: desktopicon

[Registry]
; Adicionar ao PATH do Usuário
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}\bin"; Tasks: addtopath; Check: NeedsAddPath(ExpandConstant('{app}\bin'))

; Associação de Arquivo .vox
Root: HKA; Subkey: "Software\Classes\.vox"; ValueType: string; ValueName: ""; ValueData: "VoxSourceFile"; Flags: uninsdeletevalue; Tasks: associatefiles
Root: HKA; Subkey: "Software\Classes\VoxSourceFile"; ValueType: string; ValueName: ""; ValueData: "Arquivo Fonte Vox"; Flags: uninsdeletekey; Tasks: associatefiles
Root: HKA; Subkey: "Software\Classes\VoxSourceFile\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\assets\vox_lang.ico,0"; Tasks: associatefiles
Root: HKA; Subkey: "Software\Classes\VoxSourceFile\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\bin\vox.exe"" run ""%1"""; Tasks: associatefiles
Root: HKA; Subkey: "Software\Classes\VoxSourceFile\shell\compile"; ValueType: string; ValueName: ""; ValueData: "Compilar para Binário Nativo (vox build)"; Tasks: associatefiles
Root: HKA; Subkey: "Software\Classes\VoxSourceFile\shell\compile\command"; ValueType: string; ValueName: ""; ValueData: """{app}\bin\vox.exe"" build ""%1"" --run"; Tasks: associatefiles

[Run]
Filename: "{app}\bin\vox.exe"; Parameters: "help"; Description: "Testar o compilador Vox no terminal"; Flags: nowait postinstall skipifsilent

[Code]
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + UpperCase(Param) + ';', ';' + UpperCase(OrigPath) + ';') = 0;
end;
