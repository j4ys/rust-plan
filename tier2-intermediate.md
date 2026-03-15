# Tier 2: Intermediate
### "Mastering Abstractions Without Losing Control"

> **Rust Book Chapters:** 9 – 16
> **Goal:** Understand how Rust enables zero-cost abstractions — generic code, trait-based polymorphism, and fearless concurrency — all without a garbage collector or runtime. You will also start writing programs that interact with the OS.

---

## Module 7 — Generics, Traits, and Lifetimes
*Rust Book: Chapter 10*

### Concept: Generics — Compile-Time Polymorphism

In JavaScript, you don't think about generics because everything is dynamically typed. In Rust, types are resolved at compile time. Generics let you write code that works across many types without sacrificing performance.

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}
```

**How it works under the hood — Monomorphization:**
When you call `largest(&[1i32, 2, 3])` and `largest(&[1.0f64, 2.0, 3.0])`, the compiler generates *two separate functions* — one for `i32`, one for `f64`. No runtime dispatch. No virtual function tables. This is called **monomorphization**.

Cost: slightly larger binary. Benefit: as fast as hand-written specialized code. This is the "zero-cost abstraction" promise.

Compare to JavaScript: `Math.max` is a single function that handles any number type because there's only one number type at runtime.

---

### Concept: Traits — Behavior Contracts

A trait is an interface. But more powerful than Java interfaces because:
1. You can implement traits on types you didn't define (orphan rule applies)
2. Traits can have default implementations
3. Trait bounds replace inheritance for polymorphism

```rust
trait Addressable {
    fn base_address(&self) -> u64;
    fn size(&self) -> u64;
    fn contains(&self, addr: u64) -> bool {
        // Default implementation
        addr >= self.base_address() && addr < self.base_address() + self.size()
    }
}

struct RamRegion { base: u64, length: u64 }
struct RomChip { start: u64, end: u64 }

impl Addressable for RamRegion {
    fn base_address(&self) -> u64 { self.base }
    fn size(&self) -> u64 { self.length }
}

impl Addressable for RomChip {
    fn base_address(&self) -> u64 { self.start }
    fn size(&self) -> u64 { self.end - self.start }
}

fn describe(device: &impl Addressable) {
    println!("Device at 0x{:08x}, size {} bytes", device.base_address(), device.size());
}
```

**Static dispatch vs Dynamic dispatch:**
- `fn f(x: &impl Trait)` — monomorphized, zero-cost (compile-time dispatch)
- `fn f(x: &dyn Trait)` — vtable dispatch (runtime dispatch, pointer indirection)

`dyn Trait` is like C++ virtual functions — there's a vtable (virtual function table) in memory, and each call dereferences it. Small cost, but enables runtime polymorphism.

---

### Concept: Lifetimes — References in Time

Lifetimes are compile-time annotations that track how long references are valid. They don't exist at runtime — they're purely the compiler's bookkeeping.

```rust
// This function's return value lives as long as the shortest-lived input
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

The `'a` annotation says: "the returned reference is valid as long as *both* `x` and `y` are valid."

**Hardware analogy:** Imagine two DMA transfers — you can't use the combined result longer than the shorter-lived source buffer is valid. The lifetime system is the compiler enforcing buffer validity.

**Lifetime Elision:** Most of the time, the compiler infers lifetimes. You only need to annotate when the compiler can't figure it out on its own.

```rust
// These three are equivalent (compiler elides the lifetime in the first two):
fn first_word(s: &str) -> &str { ... }
fn first_word<'a>(s: &'a str) -> &'a str { ... }  // explicit
```

---

### Concept: Struct Lifetimes

If a struct holds a reference, it needs a lifetime annotation:

```rust
struct MmapRegion<'a> {
    data: &'a [u8],  // borrowed view into a file-mapped memory region
    offset: usize,
}
// MmapRegion can't outlive the buffer it borrows from
```

---

### Quick Exercise — Generic Event Priority Queue

**Scenario:** You're building a game engine. Input events (key presses, mouse clicks) and network events (packet arrivals) both need to flow through the same priority queue, but they're different types.

- Define a trait `Event` with methods `name(&self) -> &str` and `priority(&self) -> u8` (0 = low, 255 = high)
- Implement `Event` for `struct KeyPress { key: char, shift: bool }` and `struct NetworkPacket { size: usize, src: [u8; 4] }`
- Write `fn highest_priority<'a, T: Event>(events: &'a [T]) -> Option<&'a T>` using a generic with a lifetime
- Write `fn describe(event: &dyn Event) -> String` using dynamic dispatch (`dyn Event`) — note the difference in the binary (one is monomorphized, one uses a vtable)
- Create a `Vec<KeyPress>` with 5 events of varying priority and call both functions

**Read:** Rust Book Ch 10 (Generic Types, Traits, Lifetimes) · Rust Reference — Trait Objects · Search "Rust monomorphization vs dynamic dispatch performance" and "vtable layout in Rust"

**Ask AI:** `"Show me the compiled assembly (or explain what the compiler generates) for a monomorphized generic function vs a dyn Trait call in Rust. When does the vtable indirection actually matter for performance, and when is it negligible?"`

---

### Tasks — Module 7

**Task 7.1 — Generic Data Structures**
Implement a generic ring buffer (circular buffer) — used extensively in OS kernel I/O queues:
- `struct RingBuffer<T>` with a fixed capacity (use const generics: `RingBuffer<T, const N: usize>`)
- Implement: `push(&mut self, item: T) -> bool` (returns false if full), `pop(&mut self) -> Option<T>`, `is_empty(&self) -> bool`, `is_full(&self) -> bool`, `len(&self) -> usize`
- A ring buffer uses head/tail indices into a fixed array — no heap reallocation
- Test with `RingBuffer<u8, 256>` (typical UART receive buffer size) and `RingBuffer<u32, 16>`

**Task 7.2 — Hardware Abstraction with Traits**
Design a trait-based memory bus:
- Trait `MemoryMapped`: `read8(offset: u64) -> u8`, `read16(offset: u64) -> u16`, `write8(offset: u64, val: u8)`, `base_addr(&self) -> u64`, `region_size(&self) -> u64`
- Implement it for: `Ram { data: Vec<u8> }`, `Rom { data: Vec<u8> }` (writes are no-ops), `NullDevice` (reads return 0xFF, writes are discarded — like /dev/null)
- Write a `MemoryBus` struct that holds a `Vec<Box<dyn MemoryMapped>>` and routes reads/writes to the correct device based on address range
- Test with a realistic memory map: RAM at 0x0, ROM at 0x8000, NullDevice at 0xFFFF

**Task 7.3 — Lifetime Puzzle**
Write a `PacketParser<'a>` struct that:
- Holds a `data: &'a [u8]` (borrowed from a buffer — simulating zero-copy network packet parsing)
- Implements methods to extract fields from the borrowed slice: `src_port(&self) -> u16`, `dst_port(&self) -> u16`, `payload(&self) -> &[u8]`
- In main: create a `[u8; 20]` buffer, create a `PacketParser` from it, extract and print all fields
- Try to drop the buffer before using the parser — observe the compiler error

---

## Module 8 — Error Handling
*Rust Book: Chapter 9*

### Concept: Recoverable vs Unrecoverable Errors

**`panic!`** — unrecoverable. Unwinds the stack (or aborts). Like an exception that can't be caught. Use when the program is in a state it can't reason about (a bug, not a user error). In an OS kernel, panicking is equivalent to a kernel panic — you halt and display an error.

**`Result<T, E>`** — recoverable. Errors are values. Use when the caller should decide how to handle failure (file not found, parse error, network timeout).

```rust
// The ? operator — propagate or convert errors
fn read_config(path: &str) -> Result<Config, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;  // io::Error → Box<dyn Error>
    let config = toml::from_str(&content)?;         // toml::Error → Box<dyn Error>
    Ok(config)
}
```

**Custom error types:**
```rust
#[derive(Debug)]
enum DeviceError {
    NotFound(u32),
    Timeout { device: String, after_ms: u64 },
    IoError(std::io::Error),
}

impl std::fmt::Display for DeviceError { ... }
impl std::error::Error for DeviceError { ... }

// From conversion — enables ?
impl From<std::io::Error> for DeviceError {
    fn from(e: std::io::Error) -> Self { DeviceError::IoError(e) }
}
```

---

### Quick Exercise — .env File Parser

**Scenario:** Your application reads a `.env` file for database credentials and server settings. The file can fail in distinct ways — missing file, bad formatting, or a required key not being present — and each failure needs a clear error message.

- Define `enum EnvError`: `MalformedLine { line_number: usize, content: String }` and `MissingKey(String)`
- Write `fn parse_env(content: &str) -> Result<HashMap<String, String>, EnvError>` — each non-blank, non-`#` line must be `KEY=VALUE`; return `Err(MalformedLine)` on the first bad line
- Write `fn require<'a>(map: &'a HashMap<String, String>, key: &str) -> Result<&'a str, EnvError>` — returns `Err(MissingKey)` if absent
- Chain them in `main` using `?`: parse the content, then require `"DATABASE_URL"` and `"PORT"`, print both on success
- Test with: a valid env string, a string with a bad line, and a string missing `"DATABASE_URL"`

**Read:** Rust Book Ch 9 (Error Handling) · `std::error::Error` trait docs · `thiserror` crate README · Search "Rust error handling anyhow vs thiserror"

**Ask AI:** `"Walk me through the three main approaches to error handling in Rust: Box<dyn Error>, thiserror, and anyhow. For each, show a real code example, explain the compile-time and runtime costs, and tell me which type of project each is best suited for."`

---

### Tasks — Module 8

**Task 8.1 — Kernel-style Error Handling**
Linux kernel functions return negative integers for errors (e.g., `-EINVAL`, `-ENOMEM`). Implement a Rust version:
- Create enum `KernelError` with variants: `InvalidArgument`, `OutOfMemory`, `NoDevice`, `PermissionDenied`, `TimedOut`
- Implement `From<KernelError> for i32` mapping to standard errno values (look up POSIX errno values)
- Write 5 system-call-like functions (`open_device`, `allocate_buffer`, `read_data`, `write_data`, `close_device`) each returning `Result<..., KernelError>`
- Write a `device_transaction` function that chains all 5 with `?` and properly cleans up on error using `Drop`

**Task 8.2 — ELF Header Parser**
Parse a minimal ELF binary header (ELF is the binary format used by Linux executables):
- Read `std::fs::read("/usr/bin/ls")` (or any Linux binary) or use a hardcoded header byte array
- Return custom errors for: bad magic bytes, unsupported architecture, unsupported ELF version
- Successfully parse: magic, class (32/64-bit), endianness, machine type, entry point address
- Print a summary like `readelf -h` output

---

## Module 9 — Closures and Iterators
*Rust Book: Chapter 13*

### Concept: Closures — Functions that Capture Environment

A closure is an anonymous function that can capture variables from its enclosing scope. Unlike JavaScript closures (which capture by reference through the heap), Rust closures capture based on how they're used — by reference, mutable reference, or by move.

```rust
let base_addr: u64 = 0x8000_0000;

// Captures base_addr by reference (immutable borrow)
let translate = |offset: u64| base_addr + offset;

// Captures by move (takes ownership — useful for threads)
let translate_owned = move |offset: u64| base_addr + offset;
```

**Closure types (the Fn traits):**
- `Fn` — captures by reference, can be called multiple times
- `FnMut` — captures by mutable reference, can be called multiple times
- `FnOnce` — takes ownership of captures, can only be called once

```rust
// In memory: a closure is a struct + a function pointer
// struct Closure { captured_var: u64 }
// fn call(&self, offset: u64) -> u64 { self.captured_var + offset }
```

---

### Concept: Iterators — Lazy, Zero-Cost Pipelines

Rust iterators are **lazy** — no computation happens until you consume them. The compiler can often optimize an iterator chain into a single tight loop (no intermediate allocations).

```rust
let sum: u64 = (0..1_000_000u64)
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .take(100)
    .sum();
// This compiles to a loop as fast as:
// let mut sum = 0u64; let mut count = 0; let mut n = 0u64;
// while count < 100 { if n % 2 == 0 { sum += n*n; count += 1; } n += 1; }
```

No intermediate Vec. No heap allocations. This is the zero-cost abstraction: high-level syntax, C-speed execution.

**Custom iterators:**
```rust
struct AddressRange { current: u64, end: u64, step: u64 }

impl Iterator for AddressRange {
    type Item = u64;
    fn next(&mut self) -> Option<u64> {
        if self.current >= self.end { return None; }
        let addr = self.current;
        self.current += self.step;
        Some(addr)
    }
}
```

---

### Quick Exercise — Access Log Analyzer

**Scenario:** You have nginx-style access log lines. Your ops team wants a quick summary: which endpoints are slowest, how many 5xx errors occurred, and what the average response time is — produced with zero manual loops.

- Start with a `Vec<&str>` of log lines in the format `"GET /api/users 200 45ms"`
- Using only iterator combinators (no `for` loops):
  - Parse each line into a tuple `(method, path, status_code: u16, duration_ms: u64)`
  - Filter to only `5xx` responses and count them
  - Compute the average response time across all requests using `.fold()`
  - Collect all unique paths into a sorted `Vec<String>` using `.collect()` then `.dedup()`
- Print the 5xx count, average response time, and the sorted unique path list

**Read:** Rust Book Ch 13 (Closures, Iterators) · `std::iter::Iterator` trait docs (especially the "provided methods" section) · Search "Rust iterator zero cost abstraction LLVM"

**Ask AI:** `"How does Rust's compiler optimize an iterator chain like .filter().map().fold() — does it allocate intermediate collections? Explain what 'lazy evaluation' means for iterators and show me an example where an eager approach would be worse."`

---

### Tasks — Module 9

**Task 9.1 — Iterator for a Page Table Walk**
Build an iterator that walks through page-aligned addresses:
- `struct PageIterator { current_va: u64, end_va: u64, page_size: u64 }`
- Implement `Iterator for PageIterator` yielding each page's start address
- Use it with `.filter()`, `.map()`, `.enumerate()`, `.take()` and `.collect()` in various combinations to:
  - List all 4KB pages in the range `0x1000_0000..0x1001_0000`
  - Find all pages whose addresses are 2MB-aligned
  - Collect the first 10 pages into a `Vec<u64>`

**Task 9.2 — Functional System Log Analyzer**
Given a `Vec<String>` of fake syslog lines, use iterator combinators only (no loops):
- Filter lines containing "ERROR"
- Extract the timestamp (first word) and message (rest of line)
- Deduplicate messages
- Count occurrences of each error type using `fold()` into a `HashMap`
- Print a summary report

**Task 9.3 — DMA Scatter-Gather**
DMA (Direct Memory Access) controllers often use "scatter-gather" lists — arrays of (address, length) pairs describing non-contiguous memory regions to transfer:
- Create `struct SgEntry { address: u64, length: u32 }`
- Write a function that takes `&[SgEntry]` and using iterators: computes total transfer size, finds the largest single chunk, detects any address overlaps, converts to a new list with page-aligned addresses

---

## Module 10 — Smart Pointers
*Rust Book: Chapter 15*

### Concept: Box\<T\> — Heap Allocation

`Box<T>` is the simplest smart pointer: it allocates T on the heap and owns it. When the Box is dropped, the heap memory is freed.

```rust
let b = Box::new(5i32);  // allocates 4 bytes on heap
// Stack: Box { ptr: 0x1234 }
// Heap:  5

// Use case: recursive types (can't store T directly — infinite size!)
enum List {
    Cons(i32, Box<List>),  // Box breaks the infinite recursion
    Nil,
}
```

**Use cases:**
- Recursive data structures (linked lists, trees)
- Storing trait objects (`Box<dyn Trait>`)
- Forcing large data onto the heap to avoid stack overflow
- FFI (passing heap-allocated objects across language boundaries)

---

### Concept: Rc\<T\> — Reference Counting

When multiple parts of a program need to own the same data (and you can't determine at compile time which will be last):

```rust
use std::rc::Rc;

let shared = Rc::new(vec![1, 2, 3]);
let clone1 = Rc::clone(&shared);  // increments ref count
let clone2 = Rc::clone(&shared);  // increments ref count
// Reference count = 3

drop(clone1);  // ref count → 2
drop(clone2);  // ref count → 1
drop(shared);  // ref count → 0 → memory freed
```

**Under the hood:** Rc stores the data + a reference count on the heap. `Rc::clone` doesn't copy data — it just increments the count (like `std::shared_ptr` in C++).

**Limitation:** `Rc` is NOT thread-safe. The reference count is a plain `usize`, not atomic. For multi-threaded use, you need `Arc<T>` (Atomic Reference Counting).

---

### Concept: RefCell\<T\> — Interior Mutability

Sometimes you need to mutate data even when you only have an immutable reference. `RefCell<T>` moves the borrow check to **runtime** instead of compile time:

```rust
use std::cell::RefCell;

let data = RefCell::new(vec![1, 2, 3]);
data.borrow_mut().push(4);  // runtime borrow check
let view = data.borrow();    // immutable borrow
println!("{:?}", *view);
```

If you violate the borrow rules at runtime (try to borrow mutably while already borrowed), it **panics** instead of a compile error.

**Common pattern:** `Rc<RefCell<T>>` — shared ownership with interior mutability. Used in single-threaded tree structures where multiple nodes need to reference a shared parent.

---

### Concept: Arc\<T\> + Mutex\<T\> — Concurrent Ownership

For multi-threaded scenarios:
```rust
use std::sync::{Arc, Mutex};

let shared = Arc::new(Mutex::new(0u64));  // atomic ref count + mutex lock

let clone = Arc::clone(&shared);
std::thread::spawn(move || {
    let mut guard = clone.lock().unwrap();
    *guard += 1;  // exclusive access while locked
});  // guard dropped → mutex unlocked
```

**Hardware angle:** A `Mutex` is typically implemented with a futex (fast userspace mutex) — an atomic compare-and-swap on a memory word. If uncontested, it never enters the kernel. If contested, it makes a `futex_wait` syscall to sleep until the lock is free.

---

### Concept: Deref and Drop Traits

- `Deref` — makes smart pointers work like regular references (`*box_val` dereferences to the inner value)
- `Drop` — called when a value goes out of scope (RAII destructor)

```rust
struct FileDescriptor { fd: i32 }

impl Drop for FileDescriptor {
    fn drop(&mut self) {
        unsafe { libc::close(self.fd); }
        println!("Closed fd {}", self.fd);
    }
}
// fd is guaranteed to be closed when this struct is dropped, even if we panic
```

---

### Quick Exercise — Shared Application Config

**Scenario:** Your CLI tool has multiple subsystems (logger, database, HTTP client) that all need read access to the same config, and the config can be hot-reloaded at runtime. Multiple owners, interior mutability.

- Define `struct AppConfig { log_level: String, db_url: String, port: u16 }`
- Wrap it in `Rc<RefCell<AppConfig>>` and clone the `Rc` into three "subsystem" variables: `logger_cfg`, `db_cfg`, `http_cfg`
- Each subsystem borrows and reads its relevant field via `borrow()`
- Simulate a hot-reload: mutably borrow via `borrow_mut()` to update `log_level` to `"DEBUG"`
- After the reload, have each subsystem re-read and print its field — confirm they all see the updated value
- Try to hold two `borrow_mut()` guards at the same time — observe the runtime panic and explain why this would be a compile error with the standard borrow checker

**Read:** Rust Book Ch 15 (Smart Pointers) · `std::cell::RefCell` docs · `std::rc::Rc` docs · Search "Rust interior mutability pattern" and "Cell vs RefCell vs Mutex Rust"

**Ask AI:** `"Explain interior mutability in Rust. Compare Cell, RefCell, and Mutex — what does each one cost at runtime, what does each one allow, and give me a concrete scenario where each is the right choice over the other two."`

---

### Tasks — Module 10

**Task 10.1 — Binary Tree**
Implement a generic binary search tree using `Box<T>`:
- `enum BstNode<T> { Leaf, Node { value: T, left: Box<BstNode<T>>, right: Box<BstNode<T>> } }`
- Implement: `insert`, `contains`, `min`, `max`, `height`
- Test with 1000 random u64 values
- Calculate and print the tree height — notice how it differs from a balanced tree

**Task 10.2 — Device Registry**
Build a thread-safe device registry using `Arc<Mutex<...>>`:
- `DeviceRegistry` holds a `HashMap<u32, Arc<dyn Device + Send + Sync>>` where Device has methods `id()`, `name()`, `status()`
- Spawn 4 threads, each registering 10 devices concurrently
- Spawn 4 more threads reading from the registry concurrently
- No data races, no deadlocks
- After all threads complete, print the total device count

**Task 10.3 — RAII File Lock**
Implement a file-based lock (like `flock` in Unix) using RAII:
- `struct FileLock { path: String, fd: i32 }` — acquires lock on construction
- `impl Drop for FileLock` — releases lock on destruction
- Write two functions that try to acquire the same lock
- Demonstrate that the second acquisition blocks until the first lock is dropped
- Use `std::fs` and `std::os::unix::io` traits

---

## Module 11 — Concurrency and Parallelism
*Rust Book: Chapter 16*

### Concept: Threads and the Ownership Model

Rust's concurrency model is based on ownership. The key question: *who owns what data, and for how long?*

```rust
use std::thread;

let data = vec![1, 2, 3];

let handle = thread::spawn(move || {
    // `move` transfers ownership of `data` into this thread's closure
    println!("{:?}", data);
});

handle.join().unwrap();  // wait for thread to finish
// `data` is gone — owned by the spawned thread now
```

**The `Send` and `Sync` marker traits:**
- `Send` — safe to transfer ownership to another thread
- `Sync` — safe to access from multiple threads simultaneously (via shared reference)

These are automatically implemented by the compiler for most types. `Rc<T>` is NOT `Send` (its ref count is not atomic). `RefCell<T>` is NOT `Sync`. The compiler refuses to compile programs that violate these.

---

### Concept: Message Passing — Channels

The Go language popularized "share memory by communicating" via channels. Rust has the same:

```rust
use std::sync::mpsc;  // multi-producer, single-consumer

let (tx, rx) = mpsc::channel::<u64>();

let tx2 = tx.clone();  // multiple producers
thread::spawn(move || { tx.send(42).unwrap(); });
thread::spawn(move || { tx2.send(99).unwrap(); });

// Receiver owns the data after receiving
println!("{}", rx.recv().unwrap());
println!("{}", rx.recv().unwrap());
```

**Hardware analogy:** A channel is like a FIFO buffer in hardware (e.g., a UART FIFO or a PCIe message queue). Producers write to one end, consumer reads from the other.

---

### Concept: Shared State — Mutex and Atomics

Sometimes message passing is too expensive. You need shared mutable state:

```rust
// For complex types: Mutex
let counter = Arc::new(Mutex::new(0u64));

// For simple integers: Atomic (no lock overhead)
use std::sync::atomic::{AtomicU64, Ordering};
let atomic_counter = Arc::new(AtomicU64::new(0));
atomic_counter.fetch_add(1, Ordering::SeqCst);
```

**Memory Ordering** is a hardware concept:
- `Ordering::Relaxed` — no synchronization, just atomicity. CPU can reorder. Fastest.
- `Ordering::Acquire/Release` — establishes happens-before relationships. Used for mutexes.
- `Ordering::SeqCst` — sequential consistency. All threads see operations in the same order. Slowest.

On x86-64, the hardware memory model is strong enough that most operations are effectively `SeqCst` for free. On ARM and RISC-V, the hardware is weaker and memory barriers (fence instructions) are inserted by the compiler for `Acquire`/`Release`.

---

### Concept: Fearless Concurrency

The combination of ownership + Send + Sync + the borrow checker means that **data races are impossible in safe Rust**. The compiler rejects programs with potential data races at compile time, not at runtime. This is unique among mainstream languages.

---

### Quick Exercise — Parallel Log Processor

**Scenario:** Your server generated a 1M-line log file overnight. You need to count occurrences of `ERROR`, `WARN`, and `INFO` across the file. It's embarrassingly parallel — split the lines into chunks and process each chunk on a separate thread.

- Create a `Vec<String>` of 10,000 fake log lines (randomly mix `"[ERROR] disk full"`, `"[WARN] high memory"`, `"[INFO] request ok"`)
- Split into 4 equal chunks
- Approach A — shared state: use `Arc<Mutex<HashMap<String, usize>>>` and spawn 4 threads, each updating the shared map
- Approach B — channels: spawn 4 threads that each send a `HashMap<String, usize>` back via an `mpsc` channel; the main thread merges them
- Run both approaches, assert the totals match, and note which felt simpler to write

**Read:** Rust Book Ch 16 (Fearless Concurrency) · `std::sync::Mutex` and `std::sync::Arc` docs · Search "Rust Send Sync traits explained" and "Linux futex system call"

**Ask AI:** `"Explain what the Send and Sync marker traits are in Rust, why Rc<T> is not Send, and why Mutex<T> is Sync. Then explain how a Mutex is actually implemented at the OS level — what is a futex and how does it avoid a syscall in the uncontested case?"`

---

### Tasks — Module 11

**Task 11.1 — Parallel Prime Sieve**
Implement a parallelized Sieve of Eratosthenes:
- Find all primes up to 10,000,000
- Divide the range into N segments (N = number of CPU cores, use `std::thread::available_parallelism`)
- Spawn one thread per segment
- Merge results
- Compare performance to single-threaded version using `std::time::Instant`

**Task 11.2 — Pipeline Architecture**
Simulate a CPU instruction pipeline (fetch → decode → execute) using channels:
- Thread 1 (fetch): generates a stream of raw instruction bytes, sends via channel
- Thread 2 (decode): receives bytes, decodes to `Instruction` enum, sends via channel
- Thread 3 (execute): receives instructions, executes them (update a simulated register file), sends results
- Thread 4 (writeback): receives results, records to a log
- Process 1000 instructions through the pipeline, measure throughput

**Task 11.3 — Lock-Free Counter**
Implement a lock-free statistics collector using atomics:
- `struct HardwareMetrics` with atomic fields: `interrupt_count`, `page_faults`, `cache_misses`, `context_switches`
- Spawn 8 threads, each incrementing each counter 100,000 times
- After all threads finish, assert total counts are exactly 800,000 each
- Try with `Ordering::Relaxed` — does it matter for the final sum? Why or why not?

**Task 11.4 — Producer-Consumer Buffer**
Implement a bounded, thread-safe ring buffer using `Mutex<>` and `Condvar`:
- N producer threads generating "sensor readings" (random u32 values)
- 1 consumer thread aggregating them (compute running average)
- Buffer capacity: 64 entries
- When buffer is full, producers wait (use `Condvar`)
- When buffer is empty, consumer waits
- Stop after 1,000,000 total readings

---

## Module 12 — I/O, Files, and System Calls
*Rust Book: Chapter 12 + std::io + std::fs + std::os*

### Concept: Everything is a File Descriptor

In Unix, the OS abstracts all I/O through **file descriptors** — small integers representing open resources (files, network sockets, pipes, devices). When you call `open()`, the kernel returns an integer fd. All subsequent operations (`read`, `write`, `ioctl`, `mmap`) use that fd.

```
fd 0 = stdin
fd 1 = stdout
fd 2 = stderr
fd 3 = first file you open
...
```

Rust's `std::fs::File` is just a wrapper around an `i32` file descriptor (on Unix). When `File` is dropped, its `Drop` impl calls `close(fd)` — RAII again.

```rust
use std::fs::File;
use std::io::{Read, Write, BufReader, BufWriter};

// Open creates an fd
let file = File::open("data.bin")?;

// BufReader adds buffering (reduces syscall count — batches small reads)
let mut reader = BufReader::new(file);
let mut contents = Vec::new();
reader.read_to_end(&mut contents)?;
// file is dropped here → close(fd) called
```

**Buffering:** Every `read()` system call has overhead — kernel mode switch (~100ns). Reading 1 byte at a time from a file means one syscall per byte. `BufReader` reads in 8KB chunks, storing the rest in a buffer. This is the same optimization hardware caches use: prefetch more than you need.

---

### Concept: Memory Mapped Files

For large files, copying data from kernel to userspace buffers is expensive. **mmap** lets you map a file directly into your process's virtual address space — the kernel pages in data on demand.

```rust
use std::fs::File;

// Using the `memmap2` crate:
let file = File::open("huge_database.bin")?;
let mmap = unsafe { memmap2::Mmap::map(&file)? };
// mmap[0..4] is now directly reading the file — no copy!
```

This is how databases (SQLite, PostgreSQL), JVM class loading, and shared libraries work. The OS's page cache handles everything.

---

### Concept: Process Spawning and IPC

```rust
use std::process::{Command, Stdio};

let output = Command::new("ls")
    .arg("-la")
    .arg("/proc")
    .stdout(Stdio::piped())
    .output()?;

let stdout = String::from_utf8(output.stdout)?;
println!("{}", stdout);
```

Under the hood: `Command::output()` calls `fork()` + `execve()` (on Unix). `fork()` creates a copy of the current process (copy-on-write memory). `execve()` replaces the process image with the new program.

---

### Quick Exercise — Config File Hot Reload

**Scenario:** Your long-running server process reads a config file at startup. Operations wants to change settings without a restart. Poll the file's modification timestamp every second and reload when it changes — the same way nginx's `kill -HUP` works, but simpler.

- Write a temp config file using `std::fs::write("config.tmp", "port=8080\nlog_level=info")`
- In a loop: read `std::fs::metadata("config.tmp")?.modified()?` and compare to the last-seen mtime
- If the timestamp changed, re-read the file with `std::fs::read_to_string`, print `"Config reloaded:"` and the new content
- Spawn a background thread that waits 2 seconds then overwrites the file with new content — this triggers your watcher
- After the reload is detected, clean up the temp file and exit

**Read:** Rust Book Ch 12 (An I/O Project) · `std::fs` and `std::io` module docs · Linux `inotify` man page · `notify` crate on docs.rs

**Ask AI:** `"How does inotify work on Linux for watching file system events — what syscalls are involved and how does it differ from polling mtime? Show me how I would use the notify crate in Rust to react to file changes instead of polling, and explain the tradeoffs between the two approaches."`

---

### Tasks — Module 12

**Task 12.1 — Binary File Format Parser**
Write a parser for a simplified binary file format (like a minimal ELF or BMP):
- Define a "SectorMap" binary format: 4-byte magic `0x53454354`, 2-byte version, 4-byte entry count, then N entries each of (8-byte address, 4-byte size, 1-byte flags)
- Write `serialize(entries: &[SectorEntry]) -> Vec<u8>` (binary → bytes)
- Write `deserialize(data: &[u8]) -> Result<Vec<SectorEntry>, ParseError>` (bytes → struct)
- Round-trip test: serialize 100 random entries, deserialize, assert equality
- Use `BufWriter` when writing to a file

**Task 12.2 — `/proc` Inspector (Linux)**
Write a tool that reads information from the Linux `/proc` filesystem (on macOS, use `sysctl` equivalents or fake the data):
- Read `/proc/cpuinfo` and parse: model name, number of cores, cache size, clock speed
- Read `/proc/meminfo` and parse: total memory, free memory, cached, available
- Read `/proc/loadavg` and parse the 3 load averages
- Display a dashboard summary

**Task 12.3 — `grep` Clone**
Build a simplified version of `grep` (this is also the Rust Book's Chapter 12 project, but extend it):
- Accept arguments: pattern, filename (support reading from stdin if `-` is passed)
- Use a `BufReader` for line-by-line reading (don't load the whole file)
- Support `-n` (line numbers), `-i` (case insensitive), `-c` (count only)
- Handle the case where the file is a directory (error gracefully)
- Measure and print the search time

---

## Tier 2 Final Project — A Multithreaded System Monitor

**Project: `sysmon`**

Build a terminal-based system monitor (a simplified `htop` / `top`).

Requirements:
- **Sampler thread:** Every 500ms, read CPU and memory stats from `/proc/stat` and `/proc/meminfo` (or platform equivalent)
- **Analyzer thread:** Receives raw samples via channel, computes CPU usage percentage (delta between samples), memory usage, running averages
- **Display thread:** Reads analyzed data from another channel and renders to terminal using ANSI escape codes
- **Main thread:** Handles signals (Ctrl+C) gracefully — use a `AtomicBool` shutdown flag
- Data flow: `Sampler → channel → Analyzer → channel → Display`
- On shutdown: flush display, print final stats, exit cleanly

The monitor should show:
```
=== sysmon v0.1 ===  [uptime: 00:02:34]
CPU:  [████████░░░░░░░░░░░░]  42.3%
MEM:  [████████████░░░░░░░░]  61.7%  (9.8 GB / 16 GB)
Samples: 284  |  Press Ctrl+C to exit
```

Build it using only `std` — no external crates except for terminal manipulation if needed.

---

**When you can complete all tasks and the final project, move to [Tier 3: Advanced →](./tier3-advanced.md)**
