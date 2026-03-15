# Rust Learning Plan
### From JavaScript Developer to Systems Programmer

---

> **Who this is for:** You write JavaScript and React fluently. You think in components, callbacks, and event loops. Now you want to understand what's *actually happening* underneath — memory, CPUs, operating systems, and hardware. Rust is the bridge. It gives you the precision of C with a compiler that won't let you shoot yourself in the foot (much).

---

## Why Rust from a Hardware Perspective?

In JavaScript, the runtime hides everything from you:
- Memory allocation? The GC handles it.
- Stack vs heap? You never think about it.
- CPU cache lines? What's that?
- System calls? Abstracted away.

In Rust, **you are the runtime.** You decide when memory is allocated and freed. You decide what lives on the stack and what lives on the heap. You will learn to think like the hardware. This plan forces you to confront every concept from the ground up.

---

## The Three Tiers

| Tier | Focus | Hardware Concepts |
|------|-------|-------------------|
| [Beginner](./tier1-beginner.md) | Ownership, Types, Control Flow | Stack, Heap, Memory Layout, Pointers |
| [Intermediate](./tier2-intermediate.md) | Traits, Lifetimes, Concurrency, Smart Pointers | CPU Caches, Atomics, Virtual Memory, Syscalls |
| [Advanced](./tier3-advanced.md) | Unsafe Rust, OS internals, Embedded, FFI | MMU, DMA, Interrupts, ABI, Linker |

---

## Ground Rules

1. **No skipping.** Every task in a tier must be completed before moving to the next.
2. **No hints.** The exercises have no hints by design. If you're stuck, re-read the relevant section of the Rust Book, then come back.
3. **Build everything.** Don't just read. Every concept has a task — write the code, compile it, break it on purpose, understand the error.
4. **Think in memory.** For every program you write, ask: *Where does this value live? When is it freed? Who owns it?*

---

## Reference Material

- [The Rust Book](https://doc.rust-lang.org/book/) — Your primary text
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) — Code-first companion
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/) — For the advanced tier (unsafe Rust)
- [OSDev Wiki](https://wiki.osdev.org/) — For OS-specific concepts
- [Computer Organization and Design](https://www.amazon.com/Computer-Organization-Design-RISC-V-Architecture/dp/0128203315) — Highly recommended reference

---

## Quick Setup

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
rustc --version
cargo --version

# Create your workspace
mkdir rust-journey && cd rust-journey

# Each exercise gets its own crate
cargo new exercise_01
```

---

## The Mental Model Shift

| JavaScript World | Rust World | Hardware Reality |
|-----------------|------------|-----------------|
| `let x = 5` | `let x: i32 = 5` | 4 bytes on the stack at a specific address |
| `const obj = {}` | `let s = String::new()` | Pointer on stack → data on heap |
| GC collects unused objects | Value dropped at end of scope | Destructor called, memory freed immediately |
| `async/await` | `async/await` + `tokio` | OS threads, futexes, epoll/kqueue |
| `undefined` | Option\<T\> | No null pointer — compiler enforced |
| Throw an error | `Result<T, E>` | No exceptions — zero-cost error handling |

---

Start with **[Tier 1: Beginner →](./tier1-beginner.md)**

---

## Full Curriculum Index

A complete map of every module, its Rust Book chapter, and the quick exercise inside it.

---

### 🟢 Tier 1 — Beginner
*Focus: Ownership, Types, Control Flow · Hardware: Stack, Heap, Memory Layout, Pointers*

| # | Module | Rust Book | Quick Exercise |
|---|--------|-----------|----------------|
| 1 | The Machine Beneath Your Code | Ch 1 & 3 | IoT Sensor Dashboard |
| 2 | Ownership: Rust's Core Innovation | Ch 4 | Web Server Config Handoff |
| 3 | Structs: Grouping Data | Ch 5 | HTTP Request Builder |
| 4 | Enums and Pattern Matching | Ch 6 | HTTP Response Classifier |
| 5 | Collections: Vec, HashMap, and Strings | Ch 8 | In-Memory DNS Cache |
| 6 | Modules, Packages, and Cargo | Ch 7 & 14 | Config Loader Library |
| 🏁 | **Final Project** | — | Build a Process Memory Simulator |

---

### 🟡 Tier 2 — Intermediate
*Focus: Traits, Lifetimes, Concurrency, Smart Pointers · Hardware: CPU Caches, Atomics, Virtual Memory, Syscalls*

| # | Module | Rust Book | Quick Exercise |
|---|--------|-----------|----------------|
| 7 | Generics, Traits, and Lifetimes | Ch 10 | Generic Event Priority Queue |
| 8 | Error Handling | Ch 9 | .env File Parser |
| 9 | Closures and Iterators | Ch 13 | Access Log Analyzer |
| 10 | Smart Pointers | Ch 15 | Shared Application Config |
| 11 | Concurrency and Parallelism | Ch 16 | Parallel Log Processor |
| 12 | I/O, Files, and System Calls | Ch 12 | Config File Hot Reload |
| 🏁 | **Final Project** | — | A Multithreaded System Monitor |

---

### 🔴 Tier 3 — Advanced
*Focus: Unsafe Rust, OS Internals, Embedded, FFI · Hardware: MMU, DMA, Interrupts, ABI, Linker*

| # | Module | Rust Book | Quick Exercise |
|---|--------|-----------|----------------|
| 13 | Unsafe Rust and Raw Pointers | Ch 19 + Rustonomicon | Zero-Copy HTTP Header Parser |
| 14 | The Type System: Advanced Features | Ch 17, 18, 19 | Typesafe Database Connection |
| 15 | FFI: Calling C from Rust and Rust from C | Ch 19 + Rustonomicon Ch 11 | High-Resolution Profiler Timestamp |
| 16 | Writing an OS Kernel Component | OSDev Wiki + Rustonomicon | Crash Report Address Dissector |
| 17 | Async Rust and the Runtime | Ch 17 (async) + Tokio docs | Concurrent API Health Checker |
| 18 | Linker, Build System, and Binary Internals | Cargo Book + ELF spec | Build Info Injector |
| 🏁 | **Final Project** | — | A Tiny Shell (`tinysh`) |
