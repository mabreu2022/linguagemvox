// ============================================================
// vox_runtime.h — Runtime Nativo em C para a Linguagem Vox
// Suporta C99, C11, MSVC, GCC e Clang
// ============================================================

#ifndef VOX_RUNTIME_H
#define VOX_RUNTIME_H

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <math.h>
#include <stdarg.h>

// ── Tipos Primitivos do Vox ──────────────────────────────────

typedef int64_t    vox_int;
typedef double     vox_float;
typedef bool       vox_bool;
typedef char       vox_char;

// ── Strings do Vox ───────────────────────────────────────────

typedef struct vox_str {
    char* data;
    size_t len;
} vox_str;

static inline vox_str* vox_str_new(const char* cstr) {
    if (!cstr) cstr = "";
    vox_str* s = (vox_str*)malloc(sizeof(vox_str));
    s->len = strlen(cstr);
    s->data = (char*)malloc(s->len + 1);
    memcpy(s->data, cstr, s->len + 1);
    return s;
}

static inline vox_str* vox_str_from_len(const char* cstr, size_t len) {
    vox_str* s = (vox_str*)malloc(sizeof(vox_str));
    s->len = len;
    s->data = (char*)malloc(len + 1);
    memcpy(s->data, cstr, len);
    s->data[len] = '\0';
    return s;
}

static inline vox_str* vox_str_concat(const vox_str* a, const vox_str* b) {
    if (!a && !b) return vox_str_new("");
    if (!a) return vox_str_new(b->data);
    if (!b) return vox_str_new(a->data);
    size_t new_len = a->len + b->len;
    char* buf = (char*)malloc(new_len + 1);
    memcpy(buf, a->data, a->len);
    memcpy(buf + a->len, b->data, b->len);
    buf[new_len] = '\0';
    vox_str* res = (vox_str*)malloc(sizeof(vox_str));
    res->data = buf;
    res->len = new_len;
    return res;
}

static inline bool vox_str_eq(const vox_str* a, const vox_str* b) {
    if (a == b) return true;
    if (!a || !b) return false;
    if (a->len != b->len) return false;
    return memcmp(a->data, b->data, a->len) == 0;
}

static inline void vox_str_free(vox_str* s) {
    if (s) {
        if (s->data) free(s->data);
        free(s);
    }
}

// ── Conversões de Tipos ──────────────────────────────────────

static inline vox_str* vox_int_to_str(vox_int v) {
    char buf[64];
    snprintf(buf, sizeof(buf), "%lld", (long long)v);
    return vox_str_new(buf);
}

static inline vox_str* vox_float_to_str(vox_float v) {
    char buf[64];
    snprintf(buf, sizeof(buf), "%g", v);
    return vox_str_new(buf);
}

static inline vox_str* vox_bool_to_str(vox_bool v) {
    return vox_str_new(v ? "true" : "false");
}

// ── Array Dinâmico Genérico ──────────────────────────────────

typedef struct vox_array {
    void** data;
    size_t len;
    size_t cap;
} vox_array;

static inline vox_array* vox_array_new(size_t initial_cap) {
    vox_array* a = (vox_array*)malloc(sizeof(vox_array));
    a->len = 0;
    a->cap = initial_cap > 0 ? initial_cap : 4;
    a->data = (void**)malloc(sizeof(void*) * a->cap);
    return a;
}

static inline void vox_array_push(vox_array* a, void* item) {
    if (a->len >= a->cap) {
        a->cap *= 2;
        a->data = (void**)realloc(a->data, sizeof(void*) * a->cap);
    }
    a->data[a->len++] = item;
}

static inline void* vox_array_pop(vox_array* a) {
    if (a->len == 0) return NULL;
    return a->data[--a->len];
}

static inline void* vox_array_get(const vox_array* a, size_t idx) {
    if (idx >= a->len) return NULL;
    return a->data[idx];
}

static inline void vox_array_set(vox_array* a, size_t idx, void* item) {
    if (idx < a->len) a->data[idx] = item;
}

static inline size_t vox_array_len(const vox_array* a) {
    return a ? a->len : 0;
}

// ── Option<T> & Result<T, E> ────────────────────────────────

typedef struct vox_option {
    bool is_some;
    void* value;
} vox_option;

static inline vox_option vox_some(void* val) {
    vox_option o;
    o.is_some = true;
    o.value = val;
    return o;
}

static inline vox_option vox_none(void) {
    vox_option o;
    o.is_some = false;
    o.value = NULL;
    return o;
}

static inline void* vox_unwrap(vox_option opt) {
    if (!opt.is_some) {
        fprintf(stderr, "Vox Panic: Called unwrap() on none\n");
        exit(1);
    }
    return opt.value;
}

typedef struct vox_result {
    bool is_ok;
    void* value;
    void* error;
} vox_result;

static inline vox_result vox_ok(void* val) {
    vox_result r;
    r.is_ok = true;
    r.value = val;
    r.error = NULL;
    return r;
}

static inline vox_result vox_err(void* err) {
    vox_result r;
    r.is_ok = false;
    r.value = NULL;
    r.error = err;
    return r;
}

// ── Canais de Comunicação CSP ────────────────────────────────

typedef struct vox_channel {
    void** buffer;
    size_t head;
    size_t tail;
    size_t count;
    size_t capacity;
    bool closed;
} vox_channel;

static inline vox_channel* vox_chan_new(size_t cap) {
    vox_channel* ch = (vox_channel*)malloc(sizeof(vox_channel));
    ch->capacity = cap > 0 ? cap : 16;
    ch->count = 0;
    ch->head = 0;
    ch->tail = 0;
    ch->closed = false;
    ch->buffer = (void**)malloc(sizeof(void*) * ch->capacity);
    return ch;
}

static inline void vox_chan_send(vox_channel* ch, void* val) {
    if (ch->closed) {
        fprintf(stderr, "Vox Panic: Cannot send on closed channel\n");
        exit(1);
    }
    if (ch->count >= ch->capacity) {
        fprintf(stderr, "Vox Panic: Channel buffer overflow (capacity %zu)\n", ch->capacity);
        exit(1);
    }
    ch->buffer[ch->tail] = val;
    ch->tail = (ch->tail + 1) % ch->capacity;
    ch->count++;
}

static inline void* vox_chan_recv(vox_channel* ch) {
    if (ch->count == 0) return NULL;
    void* val = ch->buffer[ch->head];
    ch->head = (ch->head + 1) % ch->capacity;
    ch->count--;
    return val;
}

static inline void vox_chan_close(vox_channel* ch) {
    if (ch) ch->closed = true;
}

// ── I/O e Impressão ──────────────────────────────────────────

static inline void vox_print(const char* s) {
    if (s) fputs(s, stdout);
}

static inline void vox_println(const char* s) {
    if (s) puts(s);
    else puts("");
}

static inline void vox_print_str(const vox_str* s) {
    if (s && s->data) fputs(s->data, stdout);
}

static inline void vox_println_str(const vox_str* s) {
    if (s && s->data) puts(s->data);
    else puts("");
}

static inline void vox_print_int(vox_int v) {
    printf("%lld", (long long)v);
}

static inline void vox_println_int(vox_int v) {
    printf("%lld\n", (long long)v);
}

static inline void vox_print_float(vox_float v) {
    printf("%g", v);
}

static inline void vox_println_float(vox_float v) {
    printf("%g\n", v);
}

static inline void vox_print_bool(vox_bool v) {
    fputs(v ? "true" : "false", stdout);
}

static inline void vox_println_bool(vox_bool v) {
    puts(v ? "true" : "false");
}

#define VOX_STR(s) vox_str_new(s)

static inline void vox_assert(bool cond, const char* msg) {
    if (!cond) {
        fprintf(stderr, "Assertion failed: %s\n", msg ? msg : "assertion failed");
        exit(1);
    }
}

static inline void vox_panic(const char* msg) {
    fprintf(stderr, "PANIC: %s\n", msg ? msg : "panic");
    exit(1);
}

// ── Formatação de String (format! macro) ─────────────────────

static inline vox_str* vox_str_format(const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    va_list args_copy;
    va_copy(args_copy, args);
    int needed = vsnprintf(NULL, 0, fmt, args_copy);
    va_end(args_copy);

    if (needed < 0) {
        va_end(args);
        return vox_str_new("");
    }

    char* buf = (char*)malloc(needed + 1);
    vsnprintf(buf, needed + 1, fmt, args);
    va_end(args);

    vox_str* res = (vox_str*)malloc(sizeof(vox_str));
    res->data = buf;
    res->len = needed;
    return res;
}

#endif // VOX_RUNTIME_H
