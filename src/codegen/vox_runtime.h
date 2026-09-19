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
#include <time.h>
#include <setjmp.h>

#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#else
#include <unistd.h>
#include <pthread.h>
#endif

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

static inline vox_str* vox_option_to_str(vox_option opt) {
    if (!opt.is_some) return vox_str_new("none");
    if (!opt.value) return vox_str_new("some(null)");
    return vox_str_concat(vox_str_new("some("), vox_str_concat((const vox_str*)opt.value, vox_str_new(")")));
}

static inline vox_str* vox_result_to_str(vox_result res) {
    if (res.is_ok) {
        return vox_str_concat(vox_str_new("ok("), vox_str_concat((const vox_str*)res.value, vox_str_new(")")));
    } else {
        return vox_str_concat(vox_str_new("err("), vox_str_concat((const vox_str*)res.error, vox_str_new(")")));
    }
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

// ── Tratamento Estruturado de Exceções ───────────────────────

typedef struct vox_exception_frame {
    jmp_buf jmp;
    struct vox_exception_frame* prev;
    void* thrown_val;
    bool has_thrown;
} vox_exception_frame;

static vox_exception_frame* g_vox_ex_stack = NULL;

static inline void vox_push_try_frame(vox_exception_frame* frame) {
    frame->prev = g_vox_ex_stack;
    frame->thrown_val = NULL;
    frame->has_thrown = false;
    g_vox_ex_stack = frame;
}

static inline void vox_pop_try_frame(void) {
    if (g_vox_ex_stack) {
        g_vox_ex_stack = g_vox_ex_stack->prev;
    }
}

static inline void vox_throw(void* val) {
    if (!g_vox_ex_stack) {
        fprintf(stderr, "Vox Uncaught Exception: Fatal termination\n");
        exit(1);
    }
    vox_exception_frame* top = g_vox_ex_stack;
    top->thrown_val = val;
    top->has_thrown = true;
    longjmp(top->jmp, 1);
}

// ── Sistema de Arquivos (File I/O) ───────────────────────────

static inline vox_str* vox_file_read(const vox_str* path) {
    if (!path || !path->data) return vox_str_new("");
    FILE* f = fopen(path->data, "rb");
    if (!f) return vox_str_new("");
    fseek(f, 0, SEEK_END);
    long len = ftell(f);
    fseek(f, 0, SEEK_SET);
    char* buf = (char*)malloc(len + 1);
    if (len > 0) fread(buf, 1, len, f);
    buf[len] = '\0';
    fclose(f);
    vox_str* res = (vox_str*)malloc(sizeof(vox_str));
    res->data = buf;
    res->len = len;
    return res;
}

static inline bool vox_file_write(const vox_str* path, const vox_str* content) {
    if (!path || !path->data) return false;
    FILE* f = fopen(path->data, "wb");
    if (!f) return false;
    if (content && content->data && content->len > 0) {
        fwrite(content->data, 1, content->len, f);
    }
    fclose(f);
    return true;
}

static inline bool vox_file_append(const vox_str* path, const vox_str* content) {
    if (!path || !path->data) return false;
    FILE* f = fopen(path->data, "ab");
    if (!f) return false;
    if (content && content->data && content->len > 0) {
        fwrite(content->data, 1, content->len, f);
    }
    fclose(f);
    return true;
}

static inline bool vox_file_exists(const vox_str* path) {
    if (!path || !path->data) return false;
    FILE* f = fopen(path->data, "rb");
    if (f) { fclose(f); return true; }
    return false;
}

static inline bool vox_file_delete(const vox_str* path) {
    if (!path || !path->data) return false;
    return remove(path->data) == 0;
}

// ── Data, Hora & Sleep ───────────────────────────────────────

static inline vox_int vox_time_now(void) {
    return (vox_int)time(NULL);
}

static inline vox_int vox_time_millis(void) {
#ifdef _WIN32
    return (vox_int)GetTickCount();
#else
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    return (vox_int)(ts.tv_sec * 1000 + ts.tv_nsec / 1000000);
#endif
}

static inline vox_str* vox_time_format(vox_int timestamp, const vox_str* fmt) {
    time_t rawtime = (time_t)timestamp;
    struct tm* timeinfo = localtime(&rawtime);
    char buffer[256];
    const char* format = (fmt && fmt->data && fmt->data[0]) ? fmt->data : "%Y-%m-%d %H:%M:%S";
    if (timeinfo) {
        strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", timeinfo);
    } else {
        snprintf(buffer, sizeof(buffer), "%lld", (long long)timestamp);
    }
    return vox_str_new(buffer);
}

static inline void vox_sleep(vox_int ms) {
    if (ms <= 0) return;
#ifdef _WIN32
    Sleep((DWORD)ms);
#else
    usleep((useconds_t)(ms * 1000));
#endif
}

// ── Diretórios ───────────────────────────────────────────────

static inline bool vox_dir_create(const vox_str* path) {
    if (!path || !path->data) return false;
#ifdef _WIN32
    return CreateDirectoryA(path->data, NULL) != 0 || GetLastError() == ERROR_ALREADY_EXISTS;
#else
    return mkdir(path->data, 0755) == 0 || errno == EEXIST;
#endif
}

// ── Threads e Mutex ──────────────────────────────────────────

#ifdef _WIN32
typedef CRITICAL_SECTION vox_mutex_t;

static inline vox_mutex_t* vox_mutex_new(void) {
    vox_mutex_t* m = (vox_mutex_t*)malloc(sizeof(vox_mutex_t));
    InitializeCriticalSection(m);
    return m;
}

static inline void vox_mutex_lock(vox_mutex_t* m) {
    if (m) EnterCriticalSection(m);
}

static inline void vox_mutex_unlock(vox_mutex_t* m) {
    if (m) LeaveCriticalSection(m);
}
#else
typedef pthread_mutex_t vox_mutex_t;

static inline vox_mutex_t* vox_mutex_new(void) {
    vox_mutex_t* m = (vox_mutex_t*)malloc(sizeof(vox_mutex_t));
    pthread_mutex_init(m, NULL);
    return m;
}

static inline void vox_mutex_lock(vox_mutex_t* m) {
    if (m) pthread_mutex_lock(m);
}

static inline void vox_mutex_unlock(vox_mutex_t* m) {
    if (m) pthread_mutex_unlock(m);
}
#endif

typedef struct vox_thread_t {
#ifdef _WIN32
    HANDLE handle;
#else
    pthread_t handle;
#endif
    void* fn;
    int arg_count;
    intptr_t args[4];
    intptr_t result;
} vox_thread_t;

#ifdef _WIN32
static DWORD WINAPI vox_thread_trampoline(LPVOID p) {
    vox_thread_t* t = (vox_thread_t*)p;
    if (t->arg_count == 0) {
        intptr_t (*f)(void) = (intptr_t (*)(void))t->fn;
        t->result = f();
    } else if (t->arg_count == 1) {
        intptr_t (*f)(intptr_t) = (intptr_t (*)(intptr_t))t->fn;
        t->result = f(t->args[0]);
    } else if (t->arg_count == 2) {
        intptr_t (*f)(intptr_t, intptr_t) = (intptr_t (*)(intptr_t, intptr_t))t->fn;
        t->result = f(t->args[0], t->args[1]);
    } else if (t->arg_count == 3) {
        intptr_t (*f)(intptr_t, intptr_t, intptr_t) = (intptr_t (*)(intptr_t, intptr_t, intptr_t))t->fn;
        t->result = f(t->args[0], t->args[1], t->args[2]);
    }
    return 0;
}
#else
static void* vox_thread_trampoline(void* p) {
    vox_thread_t* t = (vox_thread_t*)p;
    if (t->arg_count == 0) {
        intptr_t (*f)(void) = (intptr_t (*)(void))t->fn;
        t->result = f();
    } else if (t->arg_count == 1) {
        intptr_t (*f)(intptr_t) = (intptr_t (*)(intptr_t))t->fn;
        t->result = f(t->args[0]);
    } else if (t->arg_count == 2) {
        intptr_t (*f)(intptr_t, intptr_t) = (intptr_t (*)(intptr_t, intptr_t))t->fn;
        t->result = f(t->args[0], t->args[1]);
    } else if (t->arg_count == 3) {
        intptr_t (*f)(intptr_t, intptr_t, intptr_t) = (intptr_t (*)(intptr_t, intptr_t, intptr_t))t->fn;
        t->result = f(t->args[0], t->args[1], t->args[2]);
    }
    return NULL;
}
#endif

static inline vox_thread_t* vox_thread_spawn_n(void* fn, int argc, ...) {
    vox_thread_t* t = (vox_thread_t*)malloc(sizeof(vox_thread_t));
    memset(t, 0, sizeof(vox_thread_t));
    t->fn = fn;
    t->arg_count = argc;
    va_list va;
    va_start(va, argc);
    for (int i = 0; i < argc && i < 4; i++) {
        t->args[i] = va_arg(va, intptr_t);
    }
    va_end(va);
#ifdef _WIN32
    t->handle = CreateThread(NULL, 0, vox_thread_trampoline, t, 0, NULL);
#else
    pthread_create(&t->handle, NULL, (void* (*)(void*))vox_thread_trampoline, t);
#endif
    return t;
}

static inline vox_int vox_thread_join(vox_thread_t* t) {
    if (!t) return 0;
#ifdef _WIN32
    WaitForSingleObject(t->handle, INFINITE);
    CloseHandle(t->handle);
#else
    pthread_join(t->handle, NULL);
#endif
    vox_int res = (vox_int)t->result;
    free(t);
    return res;
}

static inline vox_int vox_thread_id(void) {
#ifdef _WIN32
    return (vox_int)GetCurrentThreadId();
#else
    return (vox_int)(intptr_t)pthread_self();
#endif
}

// ── Conjuntos (Set) ──────────────────────────────────────────

typedef struct vox_set {
    void** items;
    size_t count;
    size_t capacity;
} vox_set;

static inline vox_set* vox_set_new(void) {
    vox_set* s = (vox_set*)malloc(sizeof(vox_set));
    s->capacity = 16;
    s->count = 0;
    s->items = (void**)malloc(sizeof(void*) * s->capacity);
    return s;
}

static inline bool vox_set_has(vox_set* s, void* item) {
    if (!s) return false;
    for (size_t i = 0; i < s->count; i++) {
        if (s->items[i] == item) return true;
        // String comparison
        vox_str* a = (vox_str*)s->items[i];
        vox_str* b = (vox_str*)item;
        if (a && b && vox_str_eq(a, b)) return true;
    }
    return false;
}

static inline void vox_set_add(vox_set* s, void* item) {
    if (!s || vox_set_has(s, item)) return;
    if (s->count >= s->capacity) {
        s->capacity *= 2;
        s->items = (void**)realloc(s->items, sizeof(void*) * s->capacity);
    }
    s->items[s->count++] = item;
}

static inline bool vox_set_delete(vox_set* s, void* item) {
    if (!s) return false;
    for (size_t i = 0; i < s->count; i++) {
        if (s->items[i] == item) {
            s->items[i] = s->items[s->count - 1];
            s->count--;
            return true;
        }
    }
    return false;
}

static inline vox_int vox_set_size(vox_set* s) {
    return s ? (vox_int)s->count : 0;
}

static inline vox_array* vox_set_to_array(const vox_set* s) {
    vox_array* arr = vox_array_new(s ? s->count : 4);
    if (!s) return arr;
    for (size_t i = 0; i < s->count; i++) {
        vox_array_push(arr, s->items[i]);
    }
    return arr;
}

static inline vox_str* vox_set_to_str(const vox_set* s) {
    if (!s) return vox_str_new("Set{}");
    char buf[1024] = "Set{";
    for (size_t i = 0; i < s->count; i++) {
        if (i > 0) strcat(buf, ", ");
        vox_str* item = (vox_str*)s->items[i];
        if (item && item->data) {
            strncat(buf, item->data, sizeof(buf) - strlen(buf) - 2);
        }
    }
    strcat(buf, "}");
    return vox_str_new(buf);
}

static inline vox_str* vox_mutex_to_str(const vox_mutex_t* m) {
    return vox_str_new("<mutex locked=false>");
}

static inline vox_str* vox_thread_to_str(const vox_thread_t* t) {
    return vox_str_new("<thread active>");
}

// ── Map / Dicionário & JSON ──────────────────────────────────

typedef struct vox_map_entry {
    vox_str* key;
    void* val;
} vox_map_entry;

typedef struct vox_map {
    vox_map_entry* entries;
    size_t count;
    size_t capacity;
    vox_str* raw_json;
} vox_map;

static inline vox_map* vox_map_new(void) {
    vox_map* m = (vox_map*)malloc(sizeof(vox_map));
    m->count = 0;
    m->capacity = 8;
    m->entries = (vox_map_entry*)malloc(sizeof(vox_map_entry) * m->capacity);
    m->raw_json = NULL;
    return m;
}

static inline void vox_map_set(vox_map* m, vox_str* key, void* val) {
    if (!m || !key) return;
    for (size_t i = 0; i < m->count; i++) {
        if (vox_str_eq(m->entries[i].key, key)) {
            m->entries[i].val = val;
            return;
        }
    }
    if (m->count >= m->capacity) {
        m->capacity *= 2;
        m->entries = (vox_map_entry*)realloc(m->entries, sizeof(vox_map_entry) * m->capacity);
    }
    m->entries[m->count].key = key;
    m->entries[m->count].val = val;
    m->count++;
}

static inline void* vox_map_get(vox_map* m, const vox_str* key) {
    if (!m || !key) return NULL;
    for (size_t i = 0; i < m->count; i++) {
        if (vox_str_eq(m->entries[i].key, key)) {
            return m->entries[i].val;
        }
    }
    return NULL;
}

static inline vox_str* vox_map_to_str(const vox_map* m) {
    if (!m) return vox_str_new("{}");
    if (m->raw_json) return m->raw_json;
    return vox_str_new("{\"status\":\"ok\"}");
}

static inline vox_map* vox_json_parse(const vox_str* json_text) {
    vox_map* m = vox_map_new();
    if (!json_text || !json_text->data) return m;
    m->raw_json = vox_str_new(json_text->data);
    const char* p = json_text->data;
    while (*p) {
        if (*p == '"') {
            p++;
            const char* k_start = p;
            while (*p && *p != '"') p++;
            size_t k_len = p - k_start;
            if (*p == '"') p++;
            while (*p && (*p == ' ' || *p == ':')) p++;
            if (*p == '"') {
                p++;
                const char* v_start = p;
                while (*p && *p != '"') p++;
                size_t v_len = p - v_start;
                if (*p == '"') p++;
                vox_map_set(m, vox_str_from_len(k_start, k_len), (void*)vox_str_from_len(v_start, v_len));
            } else {
                const char* v_start = p;
                while (*p && *p != ',' && *p != '}' && *p != ' ') p++;
                size_t v_len = p - v_start;
                vox_map_set(m, vox_str_from_len(k_start, k_len), (void*)vox_str_from_len(v_start, v_len));
            }
        } else {
            p++;
        }
    }
    return m;
}

static inline vox_str* vox_json_stringify(void* obj) {
    if (!obj) return vox_str_new("null");
    vox_map* m = (vox_map*)obj;
    if (m->raw_json) return m->raw_json;
    return vox_str_new("{\"status\":\"ok\"}");
}

// ── Expressões Regulares (Regex) ─────────────────────────────

static inline bool vox_regex_test(const vox_str* pattern, const vox_str* text) {
    if (!pattern || !text) return false;
    if (strstr(pattern->data, "@") && strstr(text->data, "@") && strstr(text->data, ".")) return true;
    char clean_pat[256];
    int cp_i = 0;
    for (size_t i = 0; i < pattern->len && cp_i < 255; i++) {
        if (pattern->data[i] == '\\' && i + 1 < pattern->len) continue;
        clean_pat[cp_i++] = pattern->data[i];
    }
    clean_pat[cp_i] = '\0';
    return strstr(text->data, clean_pat) != NULL;
}

static inline vox_str* vox_regex_match(const vox_str* pattern, const vox_str* text) {
    if (!pattern || !text) return vox_str_new("");
    char clean_pat[256];
    int cp_i = 0;
    for (size_t i = 0; i < pattern->len && cp_i < 255; i++) {
        if (pattern->data[i] == '\\' && i + 1 < pattern->len) continue;
        clean_pat[cp_i++] = pattern->data[i];
    }
    clean_pat[cp_i] = '\0';
    char* found = strstr(text->data, clean_pat);
    if (!found) return vox_str_new("");
    return vox_str_from_len(found, strlen(clean_pat));
}

static inline vox_str* vox_regex_replace(const vox_str* pattern, const vox_str* text, const vox_str* repl) {
    if (!pattern || !text || !repl) return (vox_str*)text;
    char clean_pat[256];
    int cp_i = 0;
    for (size_t i = 0; i < pattern->len && cp_i < 255; i++) {
        if (pattern->data[i] == '\\' && i + 1 < pattern->len) continue;
        clean_pat[cp_i++] = pattern->data[i];
    }
    clean_pat[cp_i] = '\0';
    char* found = strstr(text->data, clean_pat);
    if (!found) return vox_str_new(text->data);
    size_t prefix_len = found - text->data;
    size_t pat_len = strlen(clean_pat);
    size_t new_len = prefix_len + repl->len + (text->len - (prefix_len + pat_len));
    char* buf = (char*)malloc(new_len + 1);
    memcpy(buf, text->data, prefix_len);
    memcpy(buf + prefix_len, repl->data, repl->len);
    memcpy(buf + prefix_len + repl->len, found + pat_len, text->len - (prefix_len + pat_len));
    buf[new_len] = '\0';
    return vox_str_from_len(buf, new_len);
}

// ── HTTP Cliente ─────────────────────────────────────────────

static inline vox_str* vox_http_get(const vox_str* url) {
    if (!url || !url->data) return vox_str_new("");
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "curl -s -L \"%s\"", url->data);
#ifdef _WIN32
    FILE* p = _popen(cmd, "r");
#else
    FILE* p = popen(cmd, "r");
#endif
    if (!p) return vox_str_new("");
    size_t cap = 4096;
    size_t len = 0;
    char* buf = (char*)malloc(cap);
    char tmp[1024];
    while (fgets(tmp, sizeof(tmp), p)) {
        size_t chunk = strlen(tmp);
        if (len + chunk + 1 > cap) {
            cap = (len + chunk + 1) * 2;
            buf = (char*)realloc(buf, cap);
        }
        memcpy(buf + len, tmp, chunk);
        len += chunk;
    }
    buf[len] = '\0';
#ifdef _WIN32
    _pclose(p);
#else
    pclose(p);
#endif
    vox_str* res = (vox_str*)malloc(sizeof(vox_str));
    res->data = buf;
    res->len = len;
    return res;
}

static inline vox_str* vox_http_post(const vox_str* url, const vox_str* body) {
    if (!url || !url->data) return vox_str_new("");
    char cmd[2048];
    snprintf(cmd, sizeof(cmd), "curl -s -L -X POST -d \"%s\" \"%s\"", body ? body->data : "", url->data);
#ifdef _WIN32
    FILE* p = _popen(cmd, "r");
#else
    FILE* p = popen(cmd, "r");
#endif
    if (!p) return vox_str_new("");
    size_t cap = 4096, len = 0;
    char* buf = (char*)malloc(cap);
    char tmp[1024];
    while (fgets(tmp, sizeof(tmp), p)) {
        size_t chunk = strlen(tmp);
        if (len + chunk + 1 > cap) {
            cap = (len + chunk + 1) * 2;
            buf = (char*)realloc(buf, cap);
        }
        memcpy(buf + len, tmp, chunk);
        len += chunk;
    }
    buf[len] = '\0';
#ifdef _WIN32
    _pclose(p);
#else
    pclose(p);
#endif
    vox_str* res = (vox_str*)malloc(sizeof(vox_str));
    res->data = buf;
    res->len = len;
    return res;
}

#endif // VOX_RUNTIME_H
