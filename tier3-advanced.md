# Tier 3: Advanced
### "Writing the Machine"

> **Rust Book Chapters:** 17 – 20 + The Rustonomicon
> **Goal:** Write Rust code that talks directly to hardware — unsafe blocks, FFI, inline assembly, OS primitives, memory-mapped I/O. Understand how your code becomes machine instructions, how the linker works, and how operating systems are built.

---

## Module 13 — Unsafe Rust and Raw Pointers
*Rust Book: Chapter 19 + The Rustonomicon*

### Concept: The Unsafe Contract

Safe Rust gives you strong guarantees. But sometimes — writing OS code, implementing allocators, calling C libraries, accessing hardware registers — those guarantees are a cage. `unsafe` is the escape hatch.

**What `unsafe` enables:**
1. Dereference raw pointers
2. Call unsafe functions (including C functions via FFI)
3. Implement unsafe traits
4. Access or modify static mutable variables
5. Access fields of `union` types

**What `unsafe` does NOT do:**
- Disable the borrow checker
- Allow data races
- Disable bounds checking on regular slices
- Disable all safety checks

```rust
let mut x: i32 = 42;

// Raw pointers — can be null, dangling, misaligned
let raw: *mut i32 = &mut x as *mut i32;
let null_ptr: *mut i32 = std::ptr::null_mut();

unsafe {
    *raw = 100;  // direct memory write through raw pointer
    // *null_ptr = 1;  // would be undefined behavior — segfault
}
```

**The `unsafe` contract:** You are telling the compiler "I have verified this is safe, even though you can't prove it." If you lie, you get undefined behavior — the compiler is allowed to generate *any* code, including code that erases your hard drive.

---

### Concept: Raw Pointer Arithmetic

```rust
let arr = [10u32, 20, 30, 40, 50];
let ptr: *const u32 = arr.as_ptr();

unsafe {
    // Pointer arithmetic: advance by N * sizeof(T) bytes
    let third = ptr.add(2);       // ptr + 2 * 4 = arr[2] address
    println!("{}", *third);        // 30

    // Manual array traversal
    for i in 0..5 {
        print!("{} ", *ptr.add(i));
    }
}
```

**Alignment:** Writing to a misaligned address is UB on most architectures. ARM will fault. x86 is lenient but slow. Always ensure `pointer as usize % align_of::<T>() == 0`.

---

### Concept: Memory-Mapped I/O

The way software talks to hardware peripherals is by reading and writing specific memory addresses. The hardware's registers are mapped into the processor's address space at fixed addresses. This is called **MMIO (Memory-Mapped I/O)**.

```rust
// On a real embedded system, a UART might be at this address:
const UART_BASE: usize = 0x1000_0000;
const UART_TX_OFFSET: usize = 0x00;
const UART_STATUS_OFFSET: usize = 0x04;
const UART_STATUS_TX_READY: u32 = 1 << 5;

unsafe fn uart_send_byte(byte: u8) {
    let status_reg = (UART_BASE + UART_STATUS_OFFSET) as *const u32;
    let tx_reg = (UART_BASE + UART_TX_OFFSET) as *mut u8;

    // Spin until TX buffer has space
    while (*status_reg) & UART_STATUS_TX_READY == 0 {
        // Compiler must NOT optimize this loop away!
        // Use volatile reads to prevent optimization:
    }

    // Write the byte
    std::ptr::write_volatile(tx_reg, byte);
}
```

**`write_volatile` / `read_volatile`:** Without volatile, the compiler might optimize away reads/writes to addresses that "don't change" from its perspective. Volatile tells the compiler: "this access has side effects you don't know about — don't reorder or eliminate it."

---

### Concept: Custom Allocators

Rust's default allocator calls the OS (malloc/mmap). For embedded systems or performance-critical code, you may want to supply your own:

```rust
use std::alloc::{GlobalAlloc, Layout};

struct BumpAllocator {
    heap_start: usize,
    heap_end: usize,
    next: std::sync::atomic::AtomicUsize,
}

unsafe impl GlobalAlloc for BumpAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let start = align_up(
            self.next.load(std::sync::atomic::Ordering::Relaxed),
            layout.align()
        );
        let end = start + layout.size();
        if end > self.heap_end { return std::ptr::null_mut(); }
        self.next.store(end, std::sync::atomic::Ordering::Relaxed);
        start as *mut u8
    }

    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: Layout) {
        // Bump allocator never frees — must reset entire heap
    }
}
```

---

### Concept: Inline Assembly

When you need to emit specific CPU instructions that Rust/LLVM won't generate:

```rust
use std::arch::asm;

// Read the current stack pointer (RSP register)
fn read_rsp() -> usize {
    let rsp: usize;
    unsafe {
        asm!("mov {}, rsp", out(reg) rsp);
    }
    rsp
}

// CPUID instruction — queries CPU capabilities
fn cpuid(leaf: u32) -> (u32, u32, u32, u32) {
    let (eax, ebx, ecx, edx): (u32, u32, u32, u32);
    unsafe {
        asm!(
            "cpuid",
            inout("eax") leaf => eax,
            out("ebx") ebx,
            out("ecx") ecx,
            out("edx") edx,
        );
    }
    (eax, ebx, ecx, edx)
}
```

---

### Quick Exercise — Zero-Copy HTTP Header Parser

**Scenario:** High-performance HTTP servers (nginx, hyper) parse request headers without allocating. They work directly on the raw bytes already in the receive buffer. Implement a zero-allocation header splitter.

- Given a `let buf: &[u8] = b"Content-Type: application/json\r\nContent-Length: 42\r\n"`
- Write `unsafe fn find_byte(ptr: *const u8, len: usize, needle: u8) -> Option<usize>` — walks the pointer forward byte-by-byte, returns the offset of the first match
- Use it to write `fn split_header(line: &[u8]) -> Option<(&[u8], &[u8])>` — splits on `:`, trims leading space from value, returns both as sub-slices of the original buffer (no allocation)
- Parse all headers in the buffer by scanning for `\r\n` boundaries using the same unsafe walker
- Print each parsed header as `"key" → "value"`, confirming you never called `String::from` or `to_vec`

**Read:** The Rustonomicon Ch 3–4 (Unsafe Rust, Raw Pointers) · Rust Reference — Raw Pointer Conversions · Search "Rust pointer provenance model" and "Stacked Borrows model"

**Ask AI:** `"What are the exact rules I must follow to write correct unsafe Rust using raw pointers? Explain pointer provenance, alignment requirements, aliasing rules, and what 'undefined behavior' actually means in terms of what the compiler is allowed to do."`

---

### Tasks — Module 13

**Task 13.1 — Implement `memcpy`**
Write your own `memcpy` using raw pointers and unsafe:
- `unsafe fn my_memcpy(dst: *mut u8, src: *const u8, count: usize)`
- It must handle overlapping regions correctly (like `memmove`)
- Test it by copying slices, including overlapping ones
- Then write a version using SIMD intrinsics from `std::arch::x86_64` to copy 16 bytes at a time with `_mm_loadu_si128` / `_mm_storeu_si128`
- Benchmark both versions with 1MB, 10MB, 100MB transfers

**Task 13.2 — MMIO Register Simulator**
Build a type-safe MMIO register abstraction (used in real embedded Rust, e.g., the `svd2rust` project):
- Trait `ReadableRegister<T>: reads value via volatile read
- Trait `WritableRegister<T>`: writes value via volatile write
- Struct `Register<T, Addr: const>` — address baked into type at compile time
- Create simulated registers for a fake "timer peripheral": `TIMER_CTRL` (u32), `TIMER_COUNT` (u64), `TIMER_ALARM` (u64)
- Write `enable_timer()`, `set_alarm(ticks: u64)`, `read_count() -> u64` using your abstractions

**Task 13.3 — Stack Inspector**
Write a program that walks its own call stack:
- Use inline assembly to get the current frame pointer (RBP register)
- Walk up the frame pointer chain: each frame's RBP points to the previous frame's RBP
- Extract return addresses (at RBP+8 on x86-64)
- Print the chain of return addresses
- Manually correlate them to function addresses using `cargo build` + `objdump -d target/debug/your_binary`

**Task 13.4 — Bump Allocator**
Implement the bump allocator from the concept section:
- Set aside a static 1MB array as your heap: `static mut HEAP: [u8; 1024*1024] = [0; 1024*1024]`
- Register it as the global allocator with `#[global_allocator]`
- All `Box::new`, `Vec::new`, `String::new` etc. will now use your allocator
- Implement a `reset()` function that resets the bump pointer
- Write a test that: allocates 10,000 Strings, counts total bytes used, resets, allocates again

---

## Module 14 — The Type System: Advanced Features
*Rust Book: Chapter 17, 18, 19*

### Concept: Trait Objects and Dynamic Dispatch

When you use `dyn Trait`, Rust creates a **fat pointer** — two words: one points to the data, one points to the **vtable** (virtual dispatch table).

```
fat pointer: { data_ptr: 0x1234, vtable_ptr: 0x5678 }

vtable at 0x5678:
┌──────────────────────────────────────────┐
│ size of the concrete type                │
│ alignment of the concrete type           │
│ drop implementation pointer              │
│ method1 function pointer                 │
│ method2 function pointer                 │
└──────────────────────────────────────────┘
```

This is identical to C++ virtual function tables. Each `dyn Trait` method call dereferences the vtable to find the function pointer, then calls it. Cost: one extra pointer dereference per call.

---

### Concept: Advanced Pattern Matching

```rust
match value {
    1 | 2 | 3 => println!("small"),
    4..=10    => println!("medium"),
    n @ 11..=100 => println!("large: {}", n),  // binding
    _ => println!("huge"),
}

// Destructuring enums with guards
match packet {
    Packet::Data { payload, checksum } if checksum == compute_checksum(payload) => {
        process(payload)
    }
    Packet::Data { .. } => eprintln!("Checksum failed"),
    Packet::Ack(seq) if seq == expected_seq => acknowledge(seq),
    _ => drop_packet(),
}
```

---

### Concept: Type State Pattern

Encode state machines in the type system — invalid state transitions become **compile errors**:

```rust
struct Uninitialized;
struct Initialized;
struct Running;

struct Device<State> {
    fd: i32,
    _state: std::marker::PhantomData<State>,
}

impl Device<Uninitialized> {
    fn new() -> Self { ... }
    fn initialize(self) -> Device<Initialized> { ... }
}

impl Device<Initialized> {
    fn start(self) -> Device<Running> { ... }
    fn configure(&mut self, ...) { ... }
}

impl Device<Running> {
    fn stop(self) -> Device<Initialized> { ... }
    fn send(&self, data: &[u8]) { ... }
}

// These are compile errors:
// let d = Device::new();
// d.send(&[1,2,3]);    // ERROR: Device<Uninitialized> has no `send` method
// d.start();           // ERROR: can't start uninitialized device
```

---

### Concept: Const Generics and Compile-Time Computation

```rust
// Enforce array sizes at compile time
fn dot_product<const N: usize>(a: &[f32; N], b: &[f32; N]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

// Compute at compile time
const fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0, 1 => 1,
        n => fibonacci(n-1) + fibonacci(n-2)
    }
}
const FIB_10: u64 = fibonacci(10);  // computed at compile time, stored as constant
```

---

### Quick Exercise — Typesafe Database Connection

**Scenario:** Developers on your team keep forgetting to call `.authenticate()` before running queries, and `.commit()` before closing. Encode the allowed operations per state directly into the type system so these mistakes are compile errors, not runtime panics.

- Define marker structs: `Disconnected`, `Connected`, `Authenticated`, `InTransaction`
- `struct DbConn<State>` with a `PhantomData<State>` field and a fake `socket: String`
- Implement methods only on the relevant state:
  - `DbConn<Disconnected>::connect(host: &str) -> DbConn<Connected>`
  - `DbConn<Connected>::authenticate(user: &str, pass: &str) -> DbConn<Authenticated>`
  - `DbConn<Authenticated>::begin() -> DbConn<InTransaction>` and `query(&self, sql: &str)`
  - `DbConn<InTransaction>::commit(self) -> DbConn<Authenticated>` and `query(&self, sql: &str)`
- Write a `main` that uses the full happy path, then try to call `query` on a `DbConn<Connected>` — confirm it does not compile

**Read:** Rust Book Ch 19 (Advanced Types) · `std::marker::PhantomData` docs · Rust Design Patterns book — Typestate pattern · Search "Rust typestate pattern variance"

**Ask AI:** `"Explain PhantomData in Rust: why is it needed for the typestate pattern, what happens to it at runtime (spoiler: it's zero-sized), and how does it interact with variance? Show me what goes wrong if you omit it from a typestate struct."`

---

### Tasks — Module 14

**Task 14.1 — USB Device State Machine**
Model the USB device state machine using the typestate pattern:
- States: `Detached`, `Powered`, `Default`, `Address`, `Configured`, `Suspended`
- Each state transition should be a type-level transformation
- Impossible transitions (e.g., going from Detached directly to Configured) should be compile errors
- Each state should only expose the methods valid in that state (e.g., only Configured can `send_data`)

**Task 14.2 — Compile-Time CRC Table**
CRC (Cyclic Redundancy Check) tables are typically precomputed:
- Write a `const fn compute_crc32_table() -> [u32; 256]` using the CRC-32 polynomial `0xEDB88320`
- Store it as `const CRC32_TABLE: [u32; 256] = compute_crc32_table()`
- Implement `fn crc32(data: &[u8]) -> u32` using the precomputed table
- Verify against known CRC32 values
- The table is baked into your binary at compile time — zero runtime cost

**Task 14.3 — Protocol Decoder with Trait Objects**
Build a protocol stack decoder using `Box<dyn Protocol>`:
- Trait `Protocol`: `name(&self) -> &str`, `decode(&self, data: &[u8]) -> Option<DecodedPacket>`, `payload_offset(&self) -> usize`
- Implement for: `EthernetFrame`, `IPv4Packet`, `TcpSegment`, `UdpDatagram`
- Build a `ProtocolStack` that holds `Vec<Box<dyn Protocol>>` and peels off each layer
- Feed in raw bytes representing an Ethernet frame containing IPv4/TCP data (construct it manually) and print each layer's decoded fields

---

## Module 15 — FFI: Calling C from Rust and Rust from C
*Rust Book: Chapter 19 — Unsafe + FFI*

### Concept: The ABI (Application Binary Interface)

When Rust calls a C function, both sides must agree on:
- How arguments are passed (registers vs stack, order)
- How the return value is communicated
- Who cleans up the stack
- How structs are laid out in memory

This agreement is the **ABI**. On x86-64 Linux/macOS, the System V AMD64 ABI specifies:
- First 6 integer args: `rdi, rsi, rdx, rcx, r8, r9`
- First 8 float args: `xmm0..xmm7`
- Return value: `rax` (integer) or `xmm0` (float)
- Stack must be 16-byte aligned before `call`

`extern "C"` in Rust means "use the C calling convention."

---

### Concept: Calling C Functions

```rust
// Declare external C functions
extern "C" {
    fn malloc(size: usize) -> *mut u8;
    fn free(ptr: *mut u8);
    fn strlen(s: *const u8) -> usize;
    fn getpid() -> i32;
}

fn main() {
    let pid = unsafe { getpid() };
    println!("My PID is {}", pid);

    // Allocate 1024 bytes using C's malloc directly
    let buf = unsafe { malloc(1024) };
    // ... use buf ...
    unsafe { free(buf) };
}
```

---

### Concept: System Calls Directly

On Linux, you don't need libc — you can make system calls directly using `syscall`:

```rust
use std::arch::asm;

fn sys_write(fd: u64, buf: *const u8, count: u64) -> i64 {
    let ret: i64;
    unsafe {
        asm!(
            "syscall",
            in("rax") 1u64,  // syscall number for write
            in("rdi") fd,
            in("rsi") buf,
            in("rdx") count,
            out("rax") ret,
            // clobbered registers per ABI
            lateout("rcx") _,
            lateout("r11") _,
        );
    }
    ret
}

fn sys_exit(code: i64) -> ! {
    unsafe {
        asm!("syscall", in("rax") 60u64, in("rdi") code, options(noreturn));
    }
}
```

---

### Concept: Exposing Rust to C

```rust
// Make Rust functions callable from C
#[no_mangle]  // don't mangle the function name
pub extern "C" fn rust_add(a: i32, b: i32) -> i32 {
    a + b
}

// Use C-compatible struct layout
#[repr(C)]
pub struct RustPoint {
    x: f64,
    y: f64,
}
```

---

### Quick Exercise — High-Resolution Profiler Timestamp

**Scenario:** You're profiling a hot code path. `std::time::Instant` works, but you want to understand what's underneath it — and on some embedded targets, `std` isn't available. Call `clock_gettime` directly via FFI.

- Declare `extern "C"` bindings for `clock_gettime(clockid: i32, tp: *mut Timespec) -> i32`
- Declare `#[repr(C)] struct Timespec { tv_sec: i64, tv_nsec: i64 }` to match the C ABI
- Write `fn now_ns() -> u64` — calls `clock_gettime(CLOCK_MONOTONIC, ...)` and returns total nanoseconds
- Use it to measure how long 1,000,000 string `.contains()` checks take, printing the result in microseconds
- Call `std::time::Instant::now()` around the same work and compare — they should agree within ~1µs

**Read:** Rust Book Ch 19 (Unsafe + FFI) · The Rustonomicon Ch 11 (FFI) · Linux `clock_gettime` man page · System V AMD64 ABI spec (search "System V ABI PDF")

**Ask AI:** `"Explain the System V AMD64 calling convention: which registers carry the first six integer arguments, which registers are caller-saved vs callee-saved, what does 'stack must be 16-byte aligned before call' mean, and how does Rust's extern C enforce this?"`

---

### Tasks — Module 15

**Task 15.1 — Bare Metal Hello World**
Write a Rust program that:
- Does NOT link against libc (`#![no_std]` for a library, or just avoid std types)
- Uses direct `syscall` assembly to print "Hello, kernel!\n" to stdout (fd 1)
- Uses `syscall` to call `exit(0)` when done
- No `println!`, no `String`, no `Vec` — only raw bytes and syscalls
- Look up the Linux x86-64 syscall table for the syscall numbers

**Task 15.2 — Call into libz**
Use the C `zlib` library from Rust (install zlib-dev if needed):
- Declare `extern "C"` bindings for `compress2` and `uncompress`
- Write a Rust function `compress(data: &[u8]) -> Vec<u8>` that calls into zlib
- Write a Rust function `decompress(data: &[u8], original_size: usize) -> Vec<u8>`
- Round-trip test with 1MB of repetitive data — verify the round-trip and print compression ratio

**Task 15.3 — Shared Library**
Build a Rust library (`.so` / `.dylib`) callable from a C program:
- In Rust: implement a simple stack data structure with `stack_create()`, `stack_push(stack, val)`, `stack_pop(stack) -> int`, `stack_destroy(stack)` — all `extern "C"` with raw pointer handles
- Write a `build.rs` that emits a C header file
- Write a small C program that uses your library
- Compile and link everything manually with `rustc` + `gcc`/`clang`

---

## Module 16 — Writing an OS Kernel Component
*Reference: OSDev Wiki, Writing an OS in Rust (blog.phil-opp.com)*

### Concept: The Bare Metal Environment

When your code runs before an OS, or IN an OS, the rules change:
- No standard library (`#![no_std]`)
- No heap allocator (until you write one)
- No stack unwinding
- No `main` — the bootloader calls your entry point
- You are responsible for setting up everything the C runtime normally does

```rust
#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}  // In a kernel, you'd print to serial, halt CPUs, etc.
}

#[no_mangle]
pub extern "C" fn _start() -> ! {
    // Your kernel entry point
    loop {}
}
```

---

### Concept: The `core` Crate

`core` is `std` without OS dependencies — no heap allocation, no threads, no I/O. It contains:
- Primitive types and their methods
- Iterators and closures
- Formatting (`core::fmt`)
- `Option`, `Result`
- Atomic types
- `core::ptr`, `core::mem`, `core::slice`

For embedded/OS code, you import from `core` instead of `std`.

---

### Concept: Virtual Memory and Page Tables

Modern CPUs use a Memory Management Unit (MMU) to translate virtual addresses to physical addresses. The CPU walks a multi-level page table on every memory access (or finds it in the TLB cache).

On x86-64, a 4-level page table (PML4 → PDPT → PD → PT) translates a 48-bit virtual address:
```
Virtual address: bits [47:39] → PML4 index
                 bits [38:30] → PDPT index
                 bits [29:21] → PD index
                 bits [20:12] → PT index
                 bits [11:0]  → Page offset (4KB pages)
```

Each page table entry is 8 bytes containing the physical address of the next table (or the final page) plus flags: Present, Writable, User/Supervisor, Execute Disable.

---

### Concept: Interrupt Handling

Interrupts are signals from hardware to the CPU: "stop what you're doing and handle me." The CPU looks up the interrupt handler in the **IDT (Interrupt Descriptor Table)**, saves its state, and jumps to the handler. When done, the CPU restores state with `iretq`.

In Rust, you need special calling conventions to write interrupt handlers:
```rust
use x86_64::structures::idt::{InterruptDescriptorTable, InterruptStackFrame};

extern "x86-interrupt" fn timer_handler(stack_frame: InterruptStackFrame) {
    // Handle timer interrupt
    // Send EOI to APIC
    unsafe { *(0xFEE000B0 as *mut u32) = 0; }  // APIC EOI register
}
```

---

### Quick Exercise — Crash Report Address Dissector

**Scenario:** Your production kernel just crashed and left a register dump in the serial log. The crash report contains raw virtual addresses. You need to decode them into page table indices to figure out which mapping was accessed.

- Write `fn dissect_va(va: u64)` that extracts and prints all five components of an x86-64 virtual address: PML4 index (bits 47:39), PDPT index (38:30), PD index (29:21), PT index (20:12), page offset (11:0)
- Detect non-canonical addresses: bits 63:48 must all equal bit 47 — if not, print `"NON-CANONICAL (invalid address)"`
- Classify as `"user space"` (bit 47 = 0) or `"kernel space"` (bit 47 = 1)
- Read the first 5 lines of `/proc/self/maps` (or hardcode 5 real-looking addresses) and run `dissect_va` on each start address
- For each address, also compute and print the corresponding physical page frame number assuming identity mapping

**Read:** OSDev Wiki — Paging · Intel SDM Volume 3 Ch 4 (Paging) · Phil Oppermann's OS Blog — "Introduction to Paging" · Search "TLB shootdown multicore"

**Ask AI:** `"Explain x86-64 virtual memory paging in detail: how does the CPU walk a 4-level page table, what is the TLB and what happens on a TLB miss, what does a page fault look like from the OS's perspective, and why is TLB shootdown expensive on multicore systems?"`

---

### Tasks — Module 16

**Task 16.1 — `no_std` Library**
Create a `no_std` crate implementing core data structures usable in an OS:
- `StaticBitmap<const N: usize>` — a fixed-size bitmap backed by `[u64; N/64]`
- Operations: `set(bit)`, `clear(bit)`, `test(bit) -> bool`, `find_first_free() -> Option<usize>`
- Use this to build a `FrameAllocator` that tracks 4KB physical memory frames
- No heap allocation — everything in static memory or on the stack
- Test using `cargo test` with a stub `std` re-export for the test binary

**Task 16.2 — Virtual Address Decoder**
Given a 64-bit x86-64 virtual address, write a function that:
- Extracts and prints each component: PML4 index, PDPT index, PD index, PT index, page offset
- Determines if the address is in canonical form (bits 63:48 must all equal bit 47)
- Classifies the address as kernel space (bit 47 = 1) or user space (bit 47 = 0)
- Test with: `0x0000_7FFF_FFFF_F000` (user stack), `0xFFFF_8000_0000_0000` (kernel), `0xDEAD_BEEF_CAFE_1234` (non-canonical)

**Task 16.3 — Bootloader Handoff Simulator**
Simulate the handoff from a bootloader to an OS kernel:
- Define a `BootInfo` struct (what a bootloader passes to a kernel):
  - Memory map: `Vec<MemoryRegion>` where each region has (start, end, type: Free/Reserved/AcpiData/KernelCode)
  - Framebuffer info: (address, width, height, stride, bits_per_pixel)
  - Kernel command line: a `&str`
- Write a `kernel_main(boot_info: &'static BootInfo) -> !` function
- In kernel_main: print memory map, calculate total free RAM, locate the largest contiguous free region, "initialize" your frame allocator from Task 16.1 using that region
- This is exactly what a real OS kernel's entry point does

---

## Module 17 — Async Rust and the Runtime
*Rust Book: Chapter 17 (async) + Tokio docs*

### Concept: Async/Await Under the Hood

JavaScript's `async/await` is built on an event loop (libuv). Rust's `async/await` compiles to **state machines** — each `async fn` becomes a struct that implements the `Future` trait.

```rust
async fn fetch_data() -> Vec<u8> {
    let response = http_get("http://example.com").await;
    response.bytes().await
}
```

Becomes roughly:
```rust
enum FetchDataFuture {
    // State 0: about to call http_get
    State0,
    // State 1: waiting for http_get, holding the future
    State1 { http_future: HttpGetFuture },
    // State 2: waiting for .bytes()
    State2 { bytes_future: BytesFuture },
    // Done
    Done,
}

impl Future for FetchDataFuture {
    type Output = Vec<u8>;
    fn poll(&mut self, cx: &mut Context) -> Poll<Vec<u8>> {
        loop {
            match self {
                State0 => {
                    let f = http_get("http://...");
                    *self = State1 { http_future: f };
                }
                State1 { http_future } => {
                    match http_future.poll(cx) {
                        Poll::Pending => return Poll::Pending,
                        Poll::Ready(r) => *self = State2 { bytes_future: r.bytes() },
                    }
                }
                // ...
            }
        }
    }
}
```

No threads needed for each concurrent operation. The executor (tokio, async-std) maintains a queue of ready futures and polls them. Blocking on I/O means the OS signals the executor (via epoll/kqueue/io_uring) when the fd is ready.

---

### Concept: Tokio's Runtime

Tokio's multi-threaded runtime uses a **work-stealing thread pool**:
1. N worker threads, each with a local task queue
2. When a thread's queue is empty, it "steals" tasks from other threads' queues
3. I/O uses `epoll` (Linux) / `kqueue` (macOS) / `io_uring` (Linux 5.1+) to wait for multiple fds simultaneously
4. Timer implementation uses a **timing wheel** — a circular array of task lists indexed by expiration time bucket

```rust
#[tokio::main]
async fn main() {
    let tasks: Vec<_> = (0..100)
        .map(|i| tokio::spawn(async move {
            // Each of these runs concurrently on the thread pool
            tokio::time::sleep(Duration::from_millis(i * 10)).await;
            i * i
        }))
        .collect();

    let results: Vec<u64> = futures::future::join_all(tasks)
        .await
        .into_iter()
        .map(|r| r.unwrap())
        .collect();
}
```

---

### Quick Exercise — Concurrent API Health Checker

**Scenario:** Your monitoring system pings 5 microservices every 30 seconds to check if they're healthy. Checking them sequentially takes 5× as long as checking them concurrently. Use Tokio to fire all 5 checks at once and collect results with a timeout.

- Define `async fn check_service(name: &str, delay_ms: u64) -> (&str, bool)` — simulates a health check with `tokio::time::sleep`, returns `(name, true)` for delay < 1000ms
- Spawn 5 concurrent checks with different simulated delays (some under 1000ms, some over)
- Wrap the entire `join_all` in a `tokio::time::timeout` of 1200ms
- Print a report: service name, status (`UP` / `DOWN` / `TIMEOUT`), and response time in ms
- Calculate and print the total wall-clock time — it should be close to the longest individual check, not the sum

**Read:** Rust Book Ch 17 (Async/Await) · Tokio Tutorial at tokio.rs · The Async Book (rust-lang.github.io/async-book) · Search "Rust Future poll waker executor"

**Ask AI:** `"Walk me through what happens at the machine level when I call .await in Rust: how is an async fn compiled into a state machine, where does the suspended state live in memory, how does the executor know when to poll again, and what is a Waker?"`

---

### Tasks — Module 17

**Task 17.1 — Build a Mini Async Executor**
Without using tokio, build your own single-threaded async executor:
- Implement `struct Executor` with a `VecDeque` of boxed futures
- Implement `spawn(future: impl Future<Output=()> + 'static)`
- Implement `run(&mut self)` that polls all ready tasks, and when all are `Pending`, sleeps
- For waking, use a simple `Arc<AtomicBool>` "ready" flag per task
- Test with a few async functions that yield via a custom `YieldOnce` future

**Task 17.2 — Async TCP Server**
Using Tokio, build a concurrent TCP server:
- Listens on port 8080
- Each connection gets its own `tokio::spawn`'d task
- Implements a simple line-based protocol: reads a command, responds
  - `PING` → `PONG\n`
  - `ECHO <msg>` → `<msg>\n`
  - `TIME` → current Unix timestamp as string
  - `QUIT` → `BYE\n` then close connection
- Use `tokio::io::BufReader` for buffered line reading
- Support 10,000 concurrent connections using `ab` or `wrk` to benchmark

**Task 17.3 — io_uring File Reader (Linux only)**
Use the `io-uring` crate to read multiple files concurrently using io_uring:
- Submit 10 read requests simultaneously to io_uring
- Process completions as they arrive
- Compare throughput to sequential blocking reads
- Explain how io_uring differs from epoll (submission vs readiness notification model)

---

## Module 18 — Linker, Build System, and Binary Internals

### Concept: From Source to Binary

```
source.rs → rustc → LLVM IR → LLVM → object file (.o) → linker (ld/lld) → ELF binary
```

**The Linker's Job:**
1. Takes multiple `.o` files
2. Resolves symbol references (`call foo` → finds where `foo` is defined)
3. Assigns final virtual addresses to each section
4. Produces the final binary

**Sections in an ELF binary:**
```
.text     → compiled machine code (executable, read-only)
.rodata   → read-only data (string literals, const data)
.data     → initialized mutable globals
.bss      → uninitialized globals (zero-initialized by OS loader)
.got      → Global Offset Table (for position-independent code)
.plt      → Procedure Linkage Table (lazy dynamic linking)
```

---

### Concept: `build.rs` — Build Scripts

Cargo runs `build.rs` before compilation. This is used for:
- Compiling C code to link against
- Generating Rust code from hardware description files
- Setting linker flags
- Detecting platform features

```rust
// build.rs
fn main() {
    // Tell cargo to link against libm
    println!("cargo:rustc-link-lib=m");

    // Re-run if C source changes
    println!("cargo:rerun-if-changed=src/native.c");

    // Compile C code
    cc::Build::new()
        .file("src/native.c")
        .compile("native");
}
```

---

### Concept: Custom Linker Scripts

For bare-metal programming, you write a linker script to define the memory layout:

```ld
/* linker.ld */
MEMORY {
    FLASH (rx)  : ORIGIN = 0x08000000, LENGTH = 256K
    RAM   (rwx) : ORIGIN = 0x20000000, LENGTH = 64K
}

SECTIONS {
    .text : {
        *(.text.reset_handler)  /* entry point first */
        *(.text*)
    } > FLASH

    .data : {
        *(.data*)
    } > RAM AT > FLASH  /* stored in FLASH, loaded to RAM at startup */

    .bss : {
        *(.bss*)
    } > RAM
}
```

---

### Quick Exercise — Build Info Injector

**Scenario:** Your binary ships to 50 production servers. When it crashes, your on-call engineer needs to know instantly which exact commit, version, and build time produced it — without any config file, just by running `./your_binary --version`.

- Write a `build.rs` that runs `git rev-parse --short HEAD` via `std::process::Command` and captures the output
- Emit it as `cargo:rustc-env=GIT_HASH=abc1234` so it's baked into the binary at compile time
- Also emit `cargo:rustc-env=BUILD_TIME` set to the current UTC timestamp (use `std::time::SystemTime`)
- In `main.rs`, read both with `env!("GIT_HASH")` and `env!("BUILD_TIME")` — these are resolved at compile time, not runtime
- If the first CLI argument is `--version`, print `"v{} (commit {} built at {})"` and exit
- Verify the strings are embedded: `strings target/release/your_binary | grep -E '^[0-9a-f]{7}$'`

**Read:** The Cargo Book — Build Scripts · Rust Reference — Conditional Compilation · GNU ld Linker Scripts Manual · ELF-64 Object File Format spec (search "ELF-64 PDF")

**Ask AI:** `"Explain how Rust's build.rs works: what can it communicate to the compiler via cargo: directives, when does Cargo decide to re-run it, how does it differ from a Makefile, and what are the security implications of allowing arbitrary code to run at build time?"`

---

### Tasks — Module 18

**Task 18.1 — Binary Inspector**
Build a Rust tool that parses an ELF binary:
- Read any ELF executable (`/usr/bin/ls` or your own compiled binary)
- Parse the ELF header: magic, class, endianness, machine type, entry point
- Parse section headers: print name, type, address, offset, size for each section
- Parse the symbol table: list all exported symbols with their addresses
- Compare your output to `readelf -a <binary>`

**Task 18.2 — Custom Section Data**
Write a Rust program that:
- Uses `#[link_section = ".my_metadata"]` to place a struct in a custom ELF section
- The struct contains: version string, build timestamp, git commit hash (use `env!("CARGO_PKG_VERSION")` and a build.rs to capture git info)
- After compiling, use `readelf` to verify the section exists
- Write a separate Rust tool that reads the binary file and extracts this metadata without executing the binary

**Task 18.3 — Linker Map Analysis**
- Compile your Tier 2 final project with `-C link-arg=-Map=output.map`
- Write a Rust program that parses the linker map file
- Report: top 10 largest symbols by size, total size of each section, which crate contributes the most code size
- This is what embedded developers do to understand binary size

---

## Tier 3 Final Project — A Tiny Shell

**Project: `tinysh`**

Build a minimal Unix shell in Rust. This forces you to use nearly everything from Tier 3.

**Requirements:**

**Core (mandatory):**
- Read input line by line (implement your own line editor or use `std::io::stdin().read_line`)
- Parse the command line: handle quoted strings, environment variable expansion (`$HOME`), tilde expansion (`~`)
- Fork + exec to run external commands (use `nix` crate or raw syscalls via FFI)
- Handle `exit [code]`, `cd [dir]`, `export VAR=value` as builtin commands
- Wait for child process and report exit code

**I/O Redirection:**
- `cmd > file` — redirect stdout to file
- `cmd < file` — redirect stdin from file
- `cmd >> file` — append stdout to file
- `cmd 2>&1` — redirect stderr to stdout

**Pipelines:**
- `cmd1 | cmd2 | cmd3` — connect with pipes (each command gets a pipe fd pair)

**Signal Handling:**
- Ctrl+C sends SIGINT to foreground process group (not to the shell)
- Ctrl+Z sends SIGTSTP — implement job control with `fg`/`bg` builtins
- Implement a `jobs` builtin showing background jobs

**History (stretch goal):**
- Save/load command history from `~/.tinysh_history`
- Arrow key navigation using raw terminal mode (read termios, `TCSANOW`)

**The binary must be smaller than 500KB stripped** (`strip target/release/tinysh && ls -lh`).

---

## What Comes Next

You've completed the full learning plan. You now think like a systems programmer. Here are natural next steps:

### Build Something Real
- **Write a container runtime** — clone namespaces, cgroups, overlay filesystems
- **Implement a simple TCP/IP stack** — Ethernet frames, IP routing, TCP state machine
- **Write an NVMe driver** — PCIe device enumeration, queue pairs, submission/completion queues
- **Build a memory allocator** — jemalloc-like slab allocator with per-CPU caches
- **Implement a filesystem** — ext2 is a good starting point

### Dive Deeper
- [Writing an OS in Rust](https://os.phil-opp.com/) — the definitive blog series
- [The Embedded Rust Book](https://docs.rust-embedded.org/book/) — for microcontrollers
- [Tokio's internals](https://tokio.rs/tokio/tutorial) — async deep dive
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/) — everything unsafe

### Hardware Targets
- **RISC-V** — open ISA, great for learning architecture, board: HiFive or QEMU
- **ARM Cortex-M** — STM32 boards (~$10), no OS, bare metal from day one
- **x86-64 QEMU** — build a bootable kernel image, test without real hardware

You built JavaScript apps that ran in a browser. Now you can build the things that browsers run on top of.

---

*← Back to [Tier 2: Intermediate](./tier2-intermediate.md) | [plan.md](./plan.md)*
