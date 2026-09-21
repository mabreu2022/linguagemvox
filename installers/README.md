# 📦 Instaladores Oficiais do Ecossistema Vox (Windows)

Esta pasta contém os scripts oficiais do **Inno Setup**, fontes dos executáveis nativos e os binários de instalação finais para distribuição pública da **Linguagem Vox** e da IDE **Vox Studio RAD**.

---

## 🚀 Binários de Instalação Prontos para Uso (`installers/dist/`)

| Instalador | Versão | Arquivo Executável | Tamanho | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| **Linguagem Vox** | `v1.1.0` | [`Vox_Language_Setup_v1.1.0.exe`](dist/Vox_Language_Setup_v1.1.0.exe) | ~9.06 MB | Compilador CLI (`vox.exe`, `kael.exe`), transpilador nativo C99, runtime, conectores SQLite/PostgreSQL/MySQL, associação da extensão `.vox` e registro no PATH do Windows. |
| **Vox Studio RAD (IDE)** | `v0.7.0` | [`Vox_Studio_RAD_Setup_v0.7.0.exe`](dist/Vox_Studio_RAD_Setup_v0.7.0.exe) | ~9.21 MB | Ambiente Visual RAD completo (Delphi-Like), Form Designer pontilhado, Object Inspector, gerador de relatórios PDF, launcher nativo `VoxStudioRAD.exe`, atalhos na Área de Trabalho/Menu Iniciar e associação de arquivos `.voxProj` e `.vxf`. |

---

## 📋 Integridade e Checksums Oficiais (SHA-256)

- **`Vox_Language_Setup_v1.1.0.exe`**:
  ```
  3af0fccdba10a358e83edaadfaa125b3354b64446a7ba380702400be40a28c4d
  ```

- **`Vox_Studio_RAD_Setup_v0.7.0.exe`**:
  ```
  f2d9db33d6acb58f014fab27a7a94885e90aadba5b49985527202d5f2e1ffb49
  ```

---

## 🛠️ Recursos Incluídos em Cada Instalador

### 1. Instalador da Linguagem Vox (`Vox_Language_Setup_v1.1.0.exe`)
- **Registro no PATH do Windows:** Adiciona automaticamente a pasta `bin/` ao PATH do usuário para que o comando `vox` e `kael` fiquem disponíveis em qualquer janela do Prompt de Comando, PowerShell ou Terminal Windows.
- **Associação de Arquivos:** Registra a extensão `.vox` com ícone personalizado e opções de contexto do Windows Explorer ("Executar com Vox" e "Compilar para Binário Nativo").
- **Exemplos e Manuais:** Inclui pasta de exemplos (`examples/`) e documentação oficial (`docs/`).
- **Atalhos no Menu Iniciar:** Atalho rápido para o terminal CLI interativo e desinstalador limpo.

### 2. Instalador do Vox Studio RAD (`Vox_Studio_RAD_Setup_v0.7.0.exe`)
- **Launcher Nativo Windows (`VoxStudioRAD.exe`):** Executável em C# sem janelas pretas de console, com inicialização em segundo plano e abertura instantânea do navegador padrão no endereço `http://localhost:4500`.
- **Suporte a Linha de Comando e Duplo Clique:** Ao dar duplo clique em qualquer projeto `.voxProj`, o launcher repassa o arquivo diretamente para o Vox Studio RAD carregar o projeto automaticamente.
- **Associações de Registro:**
  - **`.voxProj`**: Arquivos de Projeto do Vox Studio RAD com ícone oficial.
  - **`.vxf`**: Formulários Visuais do Vox.
- **Atalhos Oficiais:** Cria atalho na Área de Trabalho com ícone em alta resolução e grupo completo no Menu Iniciar (IDE, Manual HTML e Desinstalador).

---

## ⚙️ Parâmetros de Instalação Silenciosa (Para Scripts e CI/CD)

Ambos os instaladores suportam instalação automatizada e silenciosa:

```powershell
# Instalação Silenciosa com progresso
.\installers\dist\Vox_Language_Setup_v1.1.0.exe /SILENT /NORESTART

# Instalação Totalmente Oculta (Sem interface gráfica)
.\installers\dist\Vox_Language_Setup_v1.1.0.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-

# Definir Diretório de Destino Customizado
.\installers\dist\Vox_Studio_RAD_Setup_v0.7.0.exe /DIR="C:\MinhaIDE\VoxRAD" /SILENT
```

---

## 🔄 Como Recompilar os Instaladores

Para reconstruir os instaladores após realizar modificações no código da linguagem ou na IDE, execute o script mestre no terminal:

```bash
node installers/build_installers.js
```
