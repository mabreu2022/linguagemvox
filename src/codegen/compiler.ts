// ============================================================
// compiler.ts — Compilador e Gerenciador de Toolchains C para Vox
// Detecta GCC, Clang, TCC e MSVC e compila C intermediário em binários nativos
// ============================================================

import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";

export type CCompilerType = "tcc" | "gcc" | "clang" | "msvc" | "none";

export interface CompilerInfo {
  type: CCompilerType;
  path: string;
  name: string;
  version?: string;
  vcvars?: string;
}

export interface CompileOptions {
  includeDir?: string;
  outputExe?: string;
  optimize?: boolean;
  debug?: boolean;
}

export interface CompileResult {
  success: boolean;
  exePath: string;
  compiler: string;
  output: string;
  timeMs: number;
}

export class Compiler {
  private cachedCompiler: CompilerInfo | null = null;

  /**
   * Detecta o compilador C disponível no sistema (TCC embutido, GCC, Clang ou MSVC)
   */
  detectCompiler(): CompilerInfo {
    if (this.cachedCompiler) return this.cachedCompiler;

    // 1. TCC local/embutido no projeto
    const candidateTccPaths = [
      path.resolve(process.cwd(), "tools", "tcc", "tcc.exe"),
      path.resolve(__dirname, "..", "..", "tools", "tcc", "tcc.exe"),
      path.resolve(__dirname, "..", "tools", "tcc", "tcc.exe"),
    ];

    for (const tccPath of candidateTccPaths) {
      if (fs.existsSync(tccPath)) {
        try {
          const out = child_process.execSync(`"${tccPath}" -v`, { encoding: "utf-8" }).trim();
          this.cachedCompiler = {
            type: "tcc",
            path: tccPath,
            name: "Tiny C Compiler (TCC)",
            version: out.split("\n")[0],
          };
          return this.cachedCompiler;
        } catch {}
      }
    }

    // 2. GCC no PATH
    try {
      const out = child_process.execSync("gcc --version", { encoding: "utf-8" }).trim();
      this.cachedCompiler = {
        type: "gcc",
        path: "gcc",
        name: "GNU C Compiler (GCC)",
        version: out.split("\n")[0],
      };
      return this.cachedCompiler;
    } catch {}

    // 3. Clang no PATH
    try {
      const out = child_process.execSync("clang --version", { encoding: "utf-8" }).trim();
      this.cachedCompiler = {
        type: "clang",
        path: "clang",
        name: "LLVM Clang",
        version: out.split("\n")[0],
      };
      return this.cachedCompiler;
    } catch {}

    // 4. TCC no PATH
    try {
      const out = child_process.execSync("tcc -v", { encoding: "utf-8" }).trim();
      this.cachedCompiler = {
        type: "tcc",
        path: "tcc",
        name: "Tiny C Compiler (TCC)",
        version: out.split("\n")[0],
      };
      return this.cachedCompiler;
    } catch {}

    // 5. MSVC Build Tools / Visual Studio
    const candidateVcvars = [
      "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat",
      "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat",
      "C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat",
      "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Auxiliary\\Build\\vcvars64.bat",
      "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Auxiliary\\Build\\vcvars64.bat",
      "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat",
    ];

    for (const vcvars of candidateVcvars) {
      if (fs.existsSync(vcvars)) {
        this.cachedCompiler = {
          type: "msvc",
          path: "cl",
          name: "Microsoft Visual C++ (MSVC)",
          vcvars,
        };
        return this.cachedCompiler;
      }
    }

    this.cachedCompiler = {
      type: "none",
      path: "",
      name: "None",
    };
    return this.cachedCompiler;
  }

  /**
   * Localiza o diretório do cabeçalho vox_runtime.h
   */
  getRuntimeIncludeDir(): string {
    const candidates = [
      path.resolve(__dirname, "vox_runtime.h"),
      path.resolve(__dirname, "..", "..", "src", "codegen", "vox_runtime.h"),
      path.resolve(process.cwd(), "src", "codegen", "vox_runtime.h"),
      path.resolve(__dirname, "..", "codegen", "vox_runtime.h"),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return path.dirname(cand);
      }
    }
    return process.cwd();
  }

  /**
   * Compila o código C gerado em um executável nativo
   */
  compile(cFilePath: string, options: CompileOptions = {}): CompileResult {
    const compiler = this.detectCompiler();
    if (compiler.type === "none") {
      throw new Error(
        "Nenhum compilador C encontrado. Instale GCC, Clang, TCC ou MSVC para compilar código nativo Vox."
      );
    }

    const absCFile = path.resolve(cFilePath);
    if (!fs.existsSync(absCFile)) {
      throw new Error(`Arquivo C de entrada não encontrado: ${cFilePath}`);
    }

    const isWindows = process.platform === "win32";
    const defaultExeName = path.basename(absCFile, path.extname(absCFile)) + (isWindows ? ".exe" : "");
    const outputExe = options.outputExe
      ? path.resolve(options.outputExe)
      : path.join(path.dirname(absCFile), defaultExeName);

    const includeDir = options.includeDir ?? this.getRuntimeIncludeDir();

    let compileCmd: string;

    switch (compiler.type) {
      case "tcc":
        compileCmd = `"${compiler.path}" -I "${includeDir}" "${absCFile}" -o "${outputExe}"`;
        break;

      case "gcc":
      case "clang": {
        const opt = options.optimize ? "-O2" : "";
        const dbg = options.debug ? "-g" : "";
        compileCmd = `"${compiler.path}" -std=c99 -Wall -Wno-unused-variable -I "${includeDir}" "${absCFile}" -o "${outputExe}" ${opt} ${dbg} -lm`.trim();
        break;
      }

      case "msvc": {
        if (compiler.vcvars) {
          compileCmd = `cmd.exe /c "call \\"${compiler.vcvars}\\" >nul 2>&1 && cl /nologo /O2 /utf-8 /I \\"${includeDir}\\" \\"${absCFile}\\" /Fe:\\"${outputExe}\\" /link"`;
        } else {
          compileCmd = `cl /nologo /O2 /utf-8 /I "${includeDir}" "${absCFile}" /Fe:"${outputExe}" /link`;
        }
        break;
      }

      default:
        throw new Error(`Tipo de compilador não suportado: ${compiler.type}`);
    }

    const startTime = Date.now();
    let output = "";

    try {
      const execResult = child_process.execSync(compileCmd, {
        encoding: "utf-8",
        stdio: "pipe",
        windowsHide: true,
      });
      output = execResult ? execResult.toString() : "";
    } catch (err: any) {
      const stderr = err.stderr ? err.stderr.toString() : "";
      const stdout = err.stdout ? err.stdout.toString() : "";
      throw new Error(`Falha na compilação nativa C:\n${stderr || stdout || err.message}`);
    } finally {
      // Limpar arquivos intermediários do MSVC (.obj)
      if (compiler.type === "msvc") {
        const objFile = outputExe.replace(/\.exe$/i, ".obj");
        if (fs.existsSync(objFile)) {
          try { fs.unlinkSync(objFile); } catch {}
        }
      }
    }

    const timeMs = Date.now() - startTime;

    if (!fs.existsSync(outputExe)) {
      throw new Error(`Compilação finalizada mas o binário de saída não foi gerado: ${outputExe}`);
    }

    return {
      success: true,
      exePath: outputExe,
      compiler: `${compiler.name}${compiler.version ? " " + compiler.version : ""}`,
      output,
      timeMs,
    };
  }
}
