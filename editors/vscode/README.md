# Vox Language Support for Visual Studio Code

Official VS Code extension for the **Vox programming language (v1.0)** — a modern, safe systems language featuring affine ownership, traits, CSP concurrency, and sub-second native C99 compilation.

---

## Features

- 🎨 **Complete Syntax Highlighting**: Accurate TextMate grammar for structs, traits, implementations, lambdas, decorators, macros, and operators (`??`, `?.`, `::`, `|>`, `=>`).
- ⚡ **Smart Language Configuration**: Auto-closing brackets, quotes, indentation rules, comments toggling (`Ctrl+/`), and bracket matching.
- 💡 **Code Snippets**: Instant templates for functions (`fn`), structs (`struct`), traits (`trait`), implementations (`impl`), pattern matching (`match`), and coroutines (`spawn`).
- 🦀 **Modern Ownership Semantics**: Dedicated styling for affine keywords (`own`, `borrow`, `ref`, `move`, `mut`).
- 🔌 **Toolchain Integration**: Compatible with the Vox Language Server (`vox lsp`) and native compilation CLI (`vox build`).

---

## Syntax Overview & Example

```vox
// Point.vox — Modern Vox v1.0 Example
struct Point {
    x: float,
    y: float,
}

trait Printable {
    fn describe(self): str;
}

impl Printable for Point {
    fn describe(self): str {
        return format!("Point({self.x}, {self.y})");
    }
}

fn main(): void {
    let mut pt = Point { x: 10.5, y: 20.0 };
    println(pt.describe());

    // Safe Concurrency & CSP Channels
    let ch = chan_new(5);
    spawn {
        chan_send(ch, 42);
    };

    let val = chan_recv(ch);
    println("Received: " + str(val));
}
```

---

## Installation

### From the VS Code Marketplace
1. Open Visual Studio Code.
2. Press `Ctrl+P` (or `Cmd+P` on macOS) and type:
   ```text
   ext install SEU_PUBLISHER.vox-lang
   ```
3. Open any `.vox` file and start coding with full syntax highlighting!

### Manual Installation (.vsix)
If you built or downloaded the `.vsix` package manually:
```bash
code --install-extension vox-lang-1.0.0.vsix
```

---

## Language Configuration

This extension associates files with the `.vox` extension to the Vox language definition. You can also configure file associations manually in your `settings.json`:

```json
{
  "files.associations": {
    "*.vox": "vox"
  }
}
```

---

## Requirements & Toolchain

To execute and compile Vox source files natively:
- **Vox CLI**: [github.com/mabreu2022/linguagemvox](https://github.com/mabreu2022/linguagemvox)
- **Node.js**: >= 18.0.0
- **C99 Compiler** (optional for native binary output): TinyCC (bundled), GCC, Clang, or MSVC.

---

## Contributing & Issues

Found a bug in syntax highlighting or want to request a snippet?
- **Repository**: [github.com/mabreu2022/linguagemvox](https://github.com/mabreu2022/linguagemvox)
- **Issue Tracker**: [github.com/mabreu2022/linguagemvox/issues](https://github.com/mabreu2022/linguagemvox/issues)

---

## License

MIT © 2026 Mauricio Abreu and Vox Language Contributors.
