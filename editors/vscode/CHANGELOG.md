# Change Log

All notable changes to the "voxlang-tools" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-18

### Added
- Official syntax highlighting grammar for the Vox v1.0 programming language.
- Full grammar support for:
  - Core keywords: `struct`, `trait`, `impl`, `fn`, `let`, `mut`, `move`, `own`, `borrow`, `ref`.
  - Control flow: `match`, `spawn`, `async`, `await`, `if`, `elif`, `else`, `while`, `loop`, `for`.
  - Modern operators: `??` (null-coalescing), `?.` (optional-chaining), `::` (scope), `=>` (match arrow), `->` (return arrow), `|>` (pipeline).
  - Built-in types: `int`, `float`, `str`, `bool`, `char`, `void`, `Option`, `Result`, `Channel`, `Array`, `Map`.
  - Macros (`format!`, `dbg!`, `assert!`, `panic!`) and decorators (`@timed`, `@logged`, `@memoize`).
- Auto-closing brackets, surrounding pairs, and indentation rules.
- Fast code snippets for rapid development (`fn`, `struct`, `trait`, `impl`, `match`, `spawn`, `chan`, `letm`).
- Language configuration and file association for `.vox` files.
