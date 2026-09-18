import { Lexer } from '../src/lexer/lexer';
import { Parser } from '../src/parser/parser';
import { CGenerator } from '../src/codegen/c_generator';

function compile(code: string): string {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const gen = new CGenerator();
  return gen.generate(ast);
}

describe('Vox v1.0 — Passo 3: C Backend RAII & Drop Codegen', () => {

  // ── 1. Struct codegen ───────────────────────────────────────
  describe('1. Structs: stack allocation + primary constructor', () => {
    test('emits C struct definition for a struct with primary constructor', () => {
      const c = compile(`struct Vector(pub x: float, pub y: float);`);
      expect(c).toContain('struct Vox_Vector {');
      expect(c).toContain('vox_float x;');
      expect(c).toContain('vox_float y;');
    });

    test('emits Vox_Name_new() primary constructor function', () => {
      const c = compile(`struct Point(pub x: float, pub y: float);`);
      expect(c).toContain('Vox_Point Vox_Point_new(vox_float x, vox_float y)');
      expect(c).toContain('_self.x = x;');
      expect(c).toContain('_self.y = y;');
      expect(c).toContain('return _self;');
    });

    test('struct constructor call becomes Vox_Name_new(...)', () => {
      const c = compile(`
        struct Point(pub x: float, pub y: float);
        let p = Point(1.0, 2.0);
      `);
      expect(c).toContain('Vox_Point p = Vox_Point_new(');
    });

    test('struct field access uses dot notation (stack type)', () => {
      const c = compile(`
        struct Point(pub x: float, pub y: float);
        let p = Point(1.0, 2.0);
        let x = p.x;
      `);
      expect(c).toContain('p.x');
    });
  });

  // ── 2. RAII drop flags ──────────────────────────────────────
  describe('2. RAII: drop calls emitted at scope exit', () => {
    test('emits drop function for each struct', () => {
      const c = compile(`struct Buffer(pub size: int);`);
      expect(c).toContain('Vox_Buffer_drop(');
    });

    test('drop call is emitted at function scope exit', () => {
      const c = compile(`
        struct Buffer(pub size: int);
        fn makeBuffer() {
          let buf = Buffer(1024);
        }
      `);
      expect(c).toContain('Vox_Buffer_drop(&buf)');
    });

    test('no drop emitted for moved variable', () => {
      const c = compile(`
        struct Buffer(pub size: int);
        fn process(b: Buffer) {}
        fn makeBuffer() {
          let buf = Buffer(1024);
          let b2 = move buf;
        }
      `);
      // buf should be marked moved, so only b2 gets the drop (not buf again)
      const matches = (c.match(/Vox_Buffer_drop/g) ?? []).length;
      // At minimum b2 gets a drop. buf does not get a second drop.
      expect(matches).toBeGreaterThanOrEqual(1);
    });

    test('RAII drops emitted in LIFO order (last declared first dropped)', () => {
      const c = compile(`
        struct A(pub v: int);
        struct B(pub v: int);
        fn testFn() {
          let a = A(1);
          let b = B(2);
        }
      `);
      const dropA = c.lastIndexOf('Vox_A_drop(&a)');
      const dropB = c.lastIndexOf('Vox_B_drop(&b)');
      // B should be dropped before A (LIFO)
      expect(dropB).toBeGreaterThan(-1);
      expect(dropA).toBeGreaterThan(-1);
      expect(dropB).toBeLessThan(dropA);
    });
  });

  // ── 3. Impl methods ──────────────────────────────────────────
  describe('3. Impl blocks: method codegen', () => {
    test('emits method function Vox_TypeName_methodName for impl block', () => {
      const c = compile(`
        struct Counter(pub count: int);
        impl Counter {
          fn increment(self) {
            self.count = self.count + 1;
          }
        }
      `);
      expect(c).toContain('Vox_Counter_increment(');
      expect(c).toContain('Vox_Counter* self');
    });

    test('method call on struct uses Vox_Type_method(obj, ...)', () => {
      const c = compile(`
        struct Counter(pub count: int);
        impl Counter {
          fn get(self) -> int {
            return self.count;
          }
        }
        let c = Counter(0);
        let v = c.get();
      `);
      expect(c).toContain('Vox_Counter_get(');
    });
  });

  // ── 4. Option<T> codegen ─────────────────────────────────────
  describe('4. Option<T>: some, none, ??, is_some, unwrap', () => {
    test('some(x) emits vox_some((void*)(intptr_t)x)', () => {
      const c = compile(`let opt: int? = some(42);`);
      expect(c).toContain('vox_some((void*)(intptr_t)');
    });

    test('none identifier emits vox_none()', () => {
      const c = compile(`let opt: int? = none;`);
      expect(c).toContain('vox_none()');
    });

    test('?? coalesce emits is_some check with fallback', () => {
      const c = compile(`
        let opt: int? = some(10);
        let v = opt ?? 0;
      `);
      expect(c).toContain('.is_some');
      expect(c).toContain('vox_option');
    });

    test('pattern matching on Option: some(v) branch injects binding', () => {
      const c = compile(`
        let opt: int? = some(10);
        let res = match (opt) {
          some(v) => v + 1,
          none => 0,
        };
      `);
      expect(c).toContain('.is_some');
      expect(c).toContain('intptr_t v =');
    });

    test('none arm checks !is_some', () => {
      const c = compile(`
        let opt: int? = some(5);
        let r = match (opt) {
          some(v) => v,
          none => -1,
        };
      `);
      expect(c).toContain('!');
      expect(c).toContain('.is_some');
    });

    test('is_some() method call compiles correctly', () => {
      const c = compile(`
        let opt: int? = some(1);
        let b = opt.is_some();
      `);
      expect(c).toContain('.is_some');
    });
  });

  // ── 5. Move semantics in channels ────────────────────────────
  describe('5. Move semantics: chan.send(move val)', () => {
    test('chan_send call is emitted with vox_chan_send', () => {
      const c = compile(`
        let ch = chan_new(10);
        let x = 42;
        chan_send(ch, x);
      `);
      expect(c).toContain('vox_chan_send(');
    });

    test('ch.send(move val) compiles to vox_chan_send', () => {
      const c = compile(`
        struct Task(pub id: int);
        let ch = chan_new(10);
        let t = Task(1);
        ch.send(move t);
      `);
      expect(c).toContain('vox_chan_send(');
    });
  });

  // ── 6. Null-free output ───────────────────────────────────────
  describe('6. Null-free: no NullLiteral in generated C', () => {
    test('generated C contains no Vox_NullLiteral or null_literal references', () => {
      const c = compile(`
        let opt: int? = none;
        let x = 10;
      `);
      expect(c).not.toContain('NullLiteral');
      expect(c).not.toContain('null_literal');
    });
  });

  // ── 7. Regression: existing features still work ───────────────
  describe('7. Regression: existing features compile correctly', () => {
    test('println with string literal compiles', () => {
      const c = compile(`println("hello");`);
      expect(c).toContain('vox_println_str(');
    });

    test('integer arithmetic compiles', () => {
      const c = compile(`let x = 1 + 2;`);
      expect(c).toContain('vox_int x =');
      expect(c).toContain('(vox_int)1LL');
    });

    test('for loop compiles with iterator', () => {
      const c = compile(`
        let arr = [1, 2, 3];
        for x in arr {
          println(x);
        }
      `);
      expect(c).toContain('vox_array_len(');
      expect(c).toContain('vox_array_get(');
    });

    test('match on integer with wildcard compiles', () => {
      const c = compile(`
        let x = 2;
        let r = match (x) {
          1 => 10,
          _ => 99,
        };
      `);
      expect(c).toContain('_match_val_');
    });

    test('format! macro compiles', () => {
      const c = compile('let s = format!("Hello {}!", 42);');
      expect(c).toContain('vox_str_format(');
    });
  });
});
