# Tier 1: Beginner

### "Learning to Think in Memory"

> **Rust Book Chapters:** 1 – 8
> **Goal:** Understand ownership — the single most important idea in Rust, and the one that maps directly to how hardware actually manages memory.

---

## Module 1 — The Machine Beneath Your Code

_Rust Book: Chapter 1 & 3_

### What JavaScript Hides From You

When you write `let x = 5` in JavaScript, the V8 engine decides everything: where `x` lives, what type it is, when it gets cleaned up. You never see the machinery.

In Rust, the compiler makes you declare intent. Before writing a single line of Rust, you need a mental model of the machine you're programming.

---

### Concept: The Process Memory Layout

Every running program gets a chunk of virtual memory from the OS. It's divided into regions:

```
High addresses
┌─────────────────┐
│   Kernel Space  │  ← You can't touch this (without syscalls)
├─────────────────┤
│   Stack         │  ← Grows DOWNWARD. Fast. Fixed size. Auto managed.
│       ↓         │
│                 │
│       ↑         │
│   Heap          │  ← Grows UPWARD. Slow(er). Manual/RAII managed.
├─────────────────┤
│   BSS Segment   │  ← Uninitialized global variables
├─────────────────┤
│   Data Segment  │  ← Initialized global/static variables
├─────────────────┤
│   Text Segment  │  ← Your compiled machine code (read-only)
Low addresses
```

**Stack** — When you call a function, the CPU pushes a "stack frame" containing local variables and the return address. When the function returns, the frame is popped. This is O(1) — just move the stack pointer register. In Rust: anything with a known, fixed size at compile time goes here.

**Heap** — Dynamic memory. You ask the OS allocator for a chunk, use it, then return it. In Rust, `String`, `Vec`, `Box` all allocate on the heap. The allocator (`malloc` under the hood) finds a free block, marks it used, and gives you a pointer.

**Why does this matter?** In JavaScript, you never think about this. In Rust, _every type decision_ is a stack-vs-heap decision.

---

### Concept: What is a Pointer?

A pointer is just a number — a memory address. Your RAM is one giant array. Address `0x7fff5fbff8a0` means "byte number 140734799804576 in RAM." A pointer holds that number.

```
Stack memory:
Address         Value
0x7fff...100    42          ← i32 stored directly (4 bytes)
0x7fff...104    0x600000010 ← a pointer (8 bytes on 64-bit) pointing to heap
                              ↓
Heap memory:
0x600000010     H e l l o   ← String data lives here
```

JavaScript "references" are pointers — you just never see the address.

---

### Concept: Data Types and Their Sizes

```rust
// Integers — signed (can be negative) and unsigned
i8   / u8    // 1 byte  — values: -128..127 / 0..255
i16  / u16   // 2 bytes
i32  / u32   // 4 bytes  ← default integer type in Rust
i64  / u64   // 8 bytes
i128 / u128  // 16 bytes
isize / usize // pointer-sized: 4 bytes on 32-bit, 8 bytes on 64-bit

// Floats — IEEE 754 standard
f32   // 4 bytes — single precision
f64   // 8 bytes — double precision (JS uses this for ALL numbers)

// Other
bool  // 1 byte (not 1 bit — alignment reasons)
char  // 4 bytes — Rust chars are Unicode scalar values (UTF-32)
```

**Hardware angle:** CPU registers have fixed widths (64-bit on modern x86-64). When you add two `i32` values, the CPU sign-extends them to 64-bit, operates, and truncates. Understanding sizes matters for performance, struct layout, and network protocols.

---

### Concept: Variables, Mutability, and Shadowing

In JavaScript, `let` is mutable by default. In Rust it's the opposite: `let` is **immutable** by default.

```rust
let x = 5;        // immutable — the compiler guarantees x never changes
let mut y = 5;    // mutable
y = 6;            // OK
x = 6;            // COMPILE ERROR — cannot assign twice to immutable variable
```

**Why immutability by default?** Hardware perspective: immutable data can be safely shared across CPU cores without locks. The compiler knows it won't change, so it can put it in a read-only memory region or optimize aggressively.

**Shadowing** is different from mutation — it creates a new binding:

```rust
let x = 5;
let x = x + 1;    // new variable, shadows the old one
let x = x * 2;    // x is now 12
// The old bindings are gone — the stack space is reused
```

---

### Concept: Functions and the Call Stack

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b   // no semicolon = expression = return value
}
```

When `add(3, 4)` is called, the CPU:

1. Pushes arguments `3` and `4` onto the stack (or into registers — the ABI decides)
2. Pushes the return address (where to continue after `add` returns)
3. Jumps to the `add` function's code
4. Executes, puts result in a return register
5. Pops the stack frame and jumps back to the return address

The stack is just the CPU register `rsp` (stack pointer) being decremented and incremented. That's it.

---

### Concept: Control Flow

```rust
// if expressions (not statements — they return values)
let number = if condition { 5 } else { 6 };

// loop — infinite, returns a value
let result = loop {
    counter += 1;
    if counter == 10 { break counter * 2; }
};

// while
while number != 0 { number -= 1; }

// for — the idiomatic Rust loop
for element in array.iter() { ... }
for i in 0..10 { ... }  // Range: 0,1,2...9
```

---

### Quick Exercise — IoT Sensor Dashboard

**Scenario:** You're writing firmware for a weather station. It reads temperature and humidity every second and triggers an alert when values exceed safe thresholds.

- Declare immutable constants: `MAX_TEMP: f32 = 85.0`, `STATION_ID: u16 = 42`
- Declare mutable variables: `temperature: f32 = 20.0`, `humidity: f32 = 80.0`, `alert_count: u32 = 0`
- Simulate 12 sensor readings in a loop: increase temperature by 5.5 and decrease humidity by 4.0 each iteration
- Use an `if` expression (not statement) to assign `let status: &str = if temp > MAX_TEMP { "CRITICAL" } else if temp > 70.0 { "WARNING" } else { "OK" }`
- Print each reading as: `[Station 42] Temp: 75.5°C | Humidity: 48% | Status: WARNING | Alerts: 3`

**Read:** Rust Book Ch 3 (Variables, Data Types, Functions, Control Flow) · IEEE 754 floating-point standard (Wikipedia is fine) · `f32` vs `f64` in embedded systems (search "embedded Rust float types")

**Ask AI:** `"Explain how f32 represents decimal numbers in binary using IEEE 754, and why 0.1 + 0.2 does not equal 0.3 in Rust. Show the bit layout of 0.1f32."`

---

### Tasks — Module 1

**Task 1.1 — Hello, Memory**
Write a Rust program that:

- Declares an immutable integer `cpu_cores: u8` set to your machine's core count
- Declares a mutable `temperature: f32` starting at 22.5
- Simulates a "CPU thermal throttle": in a loop, increase temperature by 0.7 each iteration, and when it exceeds 95.0 print `"THROTTLING: reduce clock speed"` and break
- Print both values after the loop

**Task 1.2 — Binary and Hex**
Write a program that:

- Stores the number `255` as `u8` in binary literal syntax (`0b11111111`)
- Stores a memory address `0xDEADBEEF` as a `u32` in hex literal syntax
- Prints both in decimal, binary (`:b`), and hex (`:x`) format
- Explain in a comment why `0xDEADBEEF` cannot be stored in a `u16`

**Task 1.3 — Stack Frame Simulator**
Write a program with three functions: `main`, `process`, and `compute`. Each function should:

- Print its own name and a "fake" stack address using a local variable's address: `println!("{:p}", &local_var)`
- Call the next function in the chain
- Print "returning from [name]" when done
- Observe the addresses printed. Notice that deeper calls have lower addresses — the stack grows downward.

**Task 1.4 — Overflow Behavior**

- Create a `u8` with value `255`
- Try to add `1` to it in debug mode (what happens?)
- Try `u8::MAX`, `u8::MIN`, `i8::MIN`
- Read about "wrapping_add", "checked_add", "saturating_add" and write one example of each
- Explain in a comment why CPU integer overflow without checking is a real security vulnerability (look up "integer overflow CVE" for inspiration)

---

## Module 2 — Ownership: Rust's Core Innovation

_Rust Book: Chapter 4_

### The Problem Rust Solves

Every memory bug in C/C++ falls into a few categories:

- **Use-after-free:** Free memory, then access it again
- **Double-free:** Free the same memory twice (corrupts the allocator)
- **Memory leak:** Never free memory (heap grows forever)
- **Dangling pointer:** Pointer to a stack variable that's been popped

JavaScript solves this with a garbage collector — a background thread that tracks all references and frees memory when nothing points to it. It's safe, but you pay in: unpredictable pause times, higher memory usage, and zero control over _when_ things are freed.

Rust solves this at **compile time** with ownership rules. Zero runtime cost.

---

### Concept: The Three Ownership Rules

1. Each value in Rust has exactly one **owner**
2. There can only be one owner at a time
3. When the owner goes out of scope, the value is **dropped** (memory freed)

```rust
{
    let s = String::from("hello");  // s is allocated on the heap
    // ... use s ...
}   // s goes out of scope → Rust calls `drop(s)` → heap memory freed
    // This is called RAII: Resource Acquisition Is Initialization
```

**RAII** is the same pattern C++ destructors use. When scope ends, destructor runs, resource freed. No GC needed.

---

### Concept: Move Semantics

```rust
let s1 = String::from("hello");
let s2 = s1;  // s1 is MOVED into s2

println!("{}", s1);  // COMPILE ERROR — s1 no longer valid!
```

What happened on the machine:

```
Stack:            Heap:
s1: ptr ──────→  [h,e,l,l,o]
    len = 5
    cap = 5

After let s2 = s1:
Stack:            Heap:
s1: (invalidated)
s2: ptr ──────→  [h,e,l,l,o]  ← same heap memory, one owner
    len = 5
    cap = 5
```

The compiler doesn't copy the heap data. It just transfers ownership. This is O(1). If both `s1` and `s2` were valid, when would we free the heap memory? Freeing twice = heap corruption. So Rust simply disallows it.

**Scalar types (stack-only) are copied, not moved:**

```rust
let x = 5;
let y = x;  // x is COPIED (just 4 bytes on the stack)
println!("{}", x);  // Fine! x still valid
```

Types that implement the `Copy` trait are copied automatically. These are all fixed-size, stack-only types: integers, floats, bool, char, tuples of Copy types.

---

### Concept: Clone

When you _do_ want a heap copy:

```rust
let s1 = String::from("hello");
let s2 = s1.clone();  // Deep copy — allocates new heap memory
// Both s1 and s2 are now valid owners of their own heap data
```

**Cost:** `clone()` is O(n) — it copies every byte. The compiler makes it explicit so you always see where expensive copies happen.

---

### Concept: References and Borrowing

Instead of transferring ownership, you can _borrow_ a value:

```rust
fn calculate_length(s: &String) -> usize {  // & = reference (borrow)
    s.len()
}

let s1 = String::from("hello");
let len = calculate_length(&s1);  // pass a reference — s1 not moved
println!("{} has length {}", s1, len);  // s1 still valid
```

**What is a reference?** It's a pointer — an address pointing to the actual data. The `&` symbol means "give me the address of this value without transferring ownership."

```
Stack:
s1:    ptr ──────────────────────────→ heap: [h,e,l,l,o]
                                         ↑
reference: ptr ──────────────────────────┘  (pointer to the String, which points to heap)
```

**Borrowing rules — the borrow checker:**

1. At any time, you can have **either** one mutable reference **or** any number of immutable references
2. References must always be valid (no dangling references)

```rust
let mut s = String::from("hello");

let r1 = &s;      // OK — immutable borrow
let r2 = &s;      // OK — multiple immutable borrows allowed
// let r3 = &mut s; // COMPILE ERROR — can't borrow mutably while immutably borrowed

println!("{} {}", r1, r2);   // r1, r2 used here (borrows end)

let r3 = &mut s;  // OK — immutable borrows are done
r3.push_str(" world");
```

**Why this rule?** This is the **data race** prevention rule baked into the type system. A data race requires: two or more pointers to the same data, at least one writes, no synchronization. By forbidding mutable + immutable references simultaneously, Rust makes data races **impossible at compile time**.

---

### Concept: The Slice Type

Slices are references to a _contiguous sequence_ of elements — a "view" into memory:

```rust
let s = String::from("hello world");
let hello = &s[0..5];   // &str — a reference to bytes 0-4 of s
let world = &s[6..11];  // &str — a reference to bytes 6-10 of s
```

```
Stack:
s:      ptr=0x100, len=11, cap=11
hello:  ptr=0x100, len=5   ← points INTO s's heap memory
world:  ptr=0x106, len=5   ← different offset into same memory
```

Slices don't own data — they're fat pointers: a pointer + a length. When you work with `&str` vs `String`, you're working with a borrowed slice vs an owned heap string.

---

### Quick Exercise — Web Server Config Handoff

**Scenario:** A web server reads a raw config string at startup, parses it once, then hands each worker thread its own data. Once a worker owns the config, the main thread must not hold onto it — there's no shared mutable state.

- Create a `String` called `raw_config` holding `"host=0.0.0.0 port=8080 workers=4"`
- Write `fn parse_host(config: &str) -> &str` — borrows the string and returns a slice of just the hostname value (the part after `host=` and before the next space)
- Write `fn take_config(config: String) -> String` — takes ownership, appends `" [parsed]"` to it, and returns it
- In `main`: call `parse_host` first (borrowing), then call `take_config` (moving), then try to print `raw_config` — observe the compile error and understand why workers can't share the same owned config

**Read:** Rust Book Ch 4 (Ownership, References, Slices) · "What is ownership?" section of the Rust Reference · Search "Rust move semantics vs copy semantics"

**Ask AI:** `"Give me three real bugs from C or C++ codebases that Rust's ownership system would have caught at compile time. Explain what the bug was, how it manifested, and exactly which Rust rule prevents it."`

---

### Tasks — Module 2

**Task 2.1 — Own the String**

- Create a function `reverse_string(s: String) -> String` that takes ownership of a String and returns a new reversed String
- Create another function `string_length(s: &String) -> usize` that borrows a String and returns its length
- In main: create a String, get its length (borrowing), then reverse it (moving), then print both results
- After reversing, try to print the original variable — observe the compile error and understand why

**Task 2.2 — The Memory Inspector**
Write a program that:

- Creates a `String` called `heap_data`
- Creates an `i32` called `stack_data`
- Prints the _address_ of both using `{:p}` formatting
- Creates a reference to `heap_data` and prints the reference's address AND the address of the data it points to
- Identify which addresses are "high" (stack) vs "low" (heap)

**Task 2.3 — Dangling Prevention**
Try to write the following (it won't compile — that's the point):

```rust
fn dangle() -> &String {
    let s = String::from("hello");
    &s  // s is about to be dropped!
}
```

Read the compiler error carefully. Now fix it by returning `String` (owned) instead of `&String`. Explain in a comment what would happen in C if this were allowed (the bug is called "use-after-free" or "dangling pointer").

**Task 2.4 — Borrow Checker Puzzle**
The following code has borrow checker violations. Fix ALL of them without removing any functional intent:

```rust
fn main() {
    let mut v = vec![1, 2, 3, 4, 5];
    let first = &v[0];
    v.push(6);
    println!("The first element is: {}", first);
}
```

After fixing it, explain in a comment _why_ the original fails — think about what `push` might do to the Vec's memory.

**Task 2.5 — Word Counter**
Write a function `word_count(text: &str) -> usize` that counts words in a string slice (split on whitespace). The function must:

- Take a string slice (`&str`) not an owned String
- Not allocate any heap memory itself
- Work on both `String` and `&str` inputs from main

---

## Module 3 — Structs: Grouping Data

_Rust Book: Chapter 5_

### Concept: Struct Memory Layout

A struct is a user-defined composite type. In memory, its fields are laid out contiguously (with possible padding for alignment):

```rust
struct CpuCore {
    id: u8,          // 1 byte
    // 3 bytes padding (to align clock_speed to 4-byte boundary)
    clock_speed: u32, // 4 bytes
    temperature: f32, // 4 bytes
    active: bool,    // 1 byte
    // 3 bytes padding (to align struct size to 4-byte multiple)
}
// sizeof(CpuCore) = 16 bytes (not 10!)
```

**Memory alignment** is a hardware requirement. The x86-64 CPU reads memory most efficiently when a 4-byte value starts at a 4-byte-aligned address (address divisible by 4). Misaligned access is either an exception or a slow multi-cycle operation.

You can control layout with `#[repr(C)]` (match C layout) or `#[repr(packed)]` (no padding — dangerous but useful for hardware protocols).

---

### Concept: Methods and `self`

```rust
impl CpuCore {
    // Constructor (by convention named new)
    fn new(id: u8, clock_speed: u32) -> Self {
        CpuCore { id, clock_speed, temperature: 25.0, active: true }
    }

    // &self = immutable borrow of self (like JS `this` but read-only)
    fn is_throttling(&self) -> bool {
        self.temperature > 90.0
    }

    // &mut self = mutable borrow of self
    fn heat_up(&mut self, delta: f32) {
        self.temperature += delta;
    }

    // self = takes ownership (consumed after call)
    fn destroy(self) -> String {
        format!("Core {} decommissioned", self.id)
    }
}
```

---

### Concept: Tuple Structs and Unit Structs

```rust
// Tuple struct — named type with positional fields
struct Meters(f64);
struct Bytes(usize);

// Prevents accidentally mixing up units:
fn transfer(size: Bytes, bandwidth: Bytes) { ... }
// transfer(Meters(100.0), Bytes(1024)) → compile error!

// Unit struct — no data, used as marker types
struct Interrupt;
```

---

### Quick Exercise — HTTP Request Builder

**Scenario:** You're implementing a minimal HTTP/1.1 client library. An HTTP request has a method, path, version, and optional body. Model it cleanly so that calling code reads naturally.

- Define `struct HttpRequest` with fields: `method: &'static str`, `path: String`, `version: (u8, u8)`, `content_length: Option<usize>`
- Implement `fn new(method: &'static str, path: &str) -> Self` and `fn with_body(mut self, size: usize) -> Self` (builder pattern — takes and returns `self`)
- Implement `fn request_line(&self) -> String` — returns `"GET /api/users HTTP/1.1"`
- Implement `fn headers(&self) -> String` — returns `"Content-Length: 42\r\n"` if body is set, empty string otherwise
- Create one `GET /health` and one `POST /users` with a 128-byte body, print both request lines and headers

**Read:** Rust Book Ch 5 (Structs) · Rust Reference — Type Layout and Alignment · Search "Rust builder pattern" and "RFC 1598 associated type constructors"

**Ask AI:** `"Explain the builder pattern in Rust. Why does the builder use 'fn with_body(mut self) -> Self' instead of 'fn with_body(&mut self)'? What are the ownership implications of each, and when would you choose one over the other?"`

---

### Tasks — Module 3

**Task 3.1 — CPU Simulation**
Build a `Cpu` struct representing a simple CPU:

- Fields: `model: String`, `cores: u8`, `base_clock_mhz: u32`, `boost_clock_mhz: u32`, `tdp_watts: u8`
- Implement `new`, a method `boost_active(&self) -> bool` that returns true if boost_clock > base_clock
- Implement `Display` trait to print it nicely (look up `std::fmt::Display`)
- Create 3 different CPU instances and print them

**Task 3.2 — Memory Layout Inspector**
Write a program that:

- Defines a struct `Packet` with fields of varying sizes (`u8`, `u16`, `u32`, `u64`)
- Uses `std::mem::size_of::<Packet>()` to print its actual size
- Uses `std::mem::offset_of!` (or raw pointer arithmetic) to print the byte offset of each field
- Reorders the fields to minimize padding and verify the new size is smaller
- Add `#[repr(packed)]` and note what happens

**Task 3.3 — Register File**
CPUs have a "register file" — a set of fast storage locations. Simulate one:

- Create an enum `Register { RAX, RBX, RCX, RDX, RSP, RBP, RSI, RDI }` (these are real x86-64 register names)
- Create a struct `RegisterFile` containing a `[u64; 8]` array (8 registers, each 64 bits wide)
- Implement methods: `read(reg: Register) -> u64`, `write(reg: Register, value: u64)`
- Write a main that simulates: "store 42 in RAX, copy RAX to RBX, add RBX to RAX, print RAX"

---

## Module 4 — Enums and Pattern Matching

_Rust Book: Chapter 6_

### Concept: Enums as Tagged Unions

Rust enums are not just like JavaScript string unions. They are **tagged unions** — each variant can carry different data. In memory, the enum occupies the size of its largest variant plus a discriminant (the "tag" identifying which variant it is).

```rust
enum IpAddress {
    V4(u8, u8, u8, u8),    // 4 bytes of data
    V6(String),             // 24 bytes (String is ptr+len+cap on 64-bit)
}
// Memory: tag (1 byte) + max(4, 24) bytes = 25 bytes (+ alignment padding)
```

This is exactly how C unions work, except the compiler tracks which variant is active and prevents you from reading the wrong one. In C, you'd have to track the tag manually and could easily read `v4` data through the `v6` field — undefined behavior.

---

### Concept: Option\<T\> — Null Done Right

JavaScript has `null`, `undefined`, and object references. Any reference can be null — you have to check everywhere or get `TypeError: Cannot read property of null`.

Rust has no null. Instead:

```rust
enum Option<T> {
    Some(T),  // contains a value
    None,     // no value
}
```

The compiler forces you to handle both cases. You cannot accidentally use a `None` as if it were `Some`. This eliminates an entire class of bugs — Tony Hoare called null his "billion-dollar mistake."

```rust
let maybe_value: Option<u32> = Some(42);
// Can't use maybe_value directly as u32 — must unwrap safely:
match maybe_value {
    Some(v) => println!("Got: {}", v),
    None    => println!("Nothing here"),
}
```

---

### Concept: Pattern Matching — `match`

`match` is like a `switch` on steroids. It's exhaustive (compiler errors if you miss a case) and can destructure complex types:

```rust
enum Instruction {
    Load { register: u8, address: u32 },
    Store { register: u8, address: u32 },
    Add { dest: u8, src1: u8, src2: u8 },
    Halt,
}

fn execute(instr: Instruction) {
    match instr {
        Instruction::Load { register, address } => {
            println!("Load mem[{:#010x}] → r{}", address, register);
        }
        Instruction::Store { register, address } => {
            println!("Store r{} → mem[{:#010x}]", register, address);
        }
        Instruction::Add { dest, src1, src2 } => {
            println!("Add r{} = r{} + r{}", dest, src1, src2);
        }
        Instruction::Halt => println!("HALT"),
    }
}
```

---

### Concept: Result\<T, E\> — Errors as Values

```rust
enum Result<T, E> {
    Ok(T),   // success with value
    Err(E),  // failure with error
}
```

No exceptions. No try/catch. Errors are just values that flow through your program. The `?` operator propagates errors up the call stack:

```rust
fn read_port() -> Result<u16, String> {
    let raw = read_register(PORT_ADDR)?;  // returns Err early if failed
    Ok(raw as u16)
}
```

---

### Quick Exercise — HTTP Response Classifier

**Scenario:** You're writing middleware for a reverse proxy. Each response needs to be classified by status code so the proxy knows whether to cache it, retry it, or forward it to the client as-is.

- Define `enum HttpStatus` with variants: `Success(u16)`, `Redirect { code: u16, location: String }`, `ClientError(u16)`, `ServerError(u16)`, `Unknown(u16)`
- Write `fn classify(code: u16) -> HttpStatus` — 2xx → Success, 3xx → Redirect with a placeholder location, 4xx → ClientError, 5xx → ServerError
- Write `fn should_retry(status: &HttpStatus) -> bool` — return `true` for `ServerError` and for `ClientError(408)` or `ClientError(429)` specifically (use match guards)
- Write `fn log_line(status: &HttpStatus) -> String` — produce a one-line log entry for each variant using pattern matching
- Test with codes: `200`, `301`, `404`, `429`, `503`, `999` and print each log line

**Read:** Rust Book Ch 6 (Enums, Pattern Matching) · Rust Reference — Match Expressions and Guards · Search "Rust tagged union vs C union" and "null object pattern"

**Ask AI:** `"Explain Rust match guards with three practical examples involving enum variants. Then show me how the same logic would look in JavaScript using switch/if-else, and explain what safety guarantees Rust's exhaustive match gives that JavaScript doesn't."`

---

### Tasks — Module 4

**Task 4.1 — CPU Instruction Set**
Design a small instruction set (ISA) for a fictional 8-bit CPU:

- Create an enum `Instruction` with variants: `NOP`, `LOAD(u8, u8)` (register, immediate), `ADD(u8, u8, u8)` (dest, src1, src2), `JMP(u8)` (address), `HALT`
- Write a `decode(opcode: u8, operands: &[u8]) -> Option<Instruction>` function
- In main, decode a "program" as a `Vec<u8>` of raw bytes and print each decoded instruction
- Return `None` for unknown opcodes

**Task 4.2 — Hardware Error Handling**
Write a simulation of reading hardware registers:

- Create an enum `HardwareError` with variants: `InvalidAddress(u32)`, `Timeout`, `PermissionDenied`, `ChecksumMismatch { expected: u8, got: u8 }`
- Write `read_register(address: u32) -> Result<u32, HardwareError>` that returns errors for addresses > `0xFFFF`
- Write `init_device() -> Result<(), HardwareError>` that calls `read_register` 3 times with `?` to propagate errors
- Test both success and failure paths in main

**Task 4.3 — Option Chain**
Simulate a memory management unit (MMU) page table:

- A page table is `Vec<Option<u32>>` where index = virtual page, value = physical frame (or None if unmapped)
- Write `translate(table: &[Option<u32>], virtual_addr: u32) -> Option<u32>` that converts a virtual address to a physical address (hint: use page size = 4096, extract page number and offset)
- Write a main that maps 5 pages, deliberately leaves some unmapped, and tests lookups on both mapped and unmapped addresses

---

## Module 5 — Collections: Vec, HashMap, and Strings

_Rust Book: Chapter 8_

### Concept: Vec\<T\> — The Dynamic Array

```rust
let mut v: Vec<i32> = Vec::new();
v.push(1);  // may trigger heap reallocation!
v.push(2);
```

A `Vec` is three numbers on the stack: pointer, length, capacity.

```
Stack: Vec { ptr: 0x1000, len: 3, cap: 4 }
Heap:  [1, 2, 3, _, , , , ]
               ↑ len   ↑ cap
```

When `len == cap` and you push, Rust:

1. Allocates a new, larger chunk of heap memory (typically 2× capacity)
2. Copies all existing elements (`memcpy`)
3. Frees the old chunk
4. Updates ptr and cap

This is O(n) amortized O(1). The same as JavaScript arrays and Java ArrayLists. **The key insight:** any reference to a Vec element may be invalidated by a push! This is why the borrow checker rejected your code in Task 2.4.

---

### Concept: HashMap\<K, V\>

A hash map in Rust uses SipHash by default (cryptographically secure, resistant to HashDoS attacks). The hash function takes a key, outputs an index into a bucket array. Collisions are handled via linear probing.

```rust
use std::collections::HashMap;

let mut registers: HashMap<String, u64> = HashMap::new();
registers.insert("rax".to_string(), 0);
registers.entry("rbx".to_string()).or_insert(0);  // only insert if missing

// Access
let rax = registers.get("rax");  // → Option<&u64>
```

---

### Concept: Strings — Two Types

- `String` — owned, heap-allocated, mutable, UTF-8
- `&str` — borrowed reference, slice, immutable (usually)

```
String:       ptr → heap bytes (valid UTF-8)
&str:         ptr + len (can point to: heap, stack, or program binary)
```

**UTF-8 matters:** `s[0]` doesn't work on Rust strings because a character may be 1-4 bytes. Rust forces you to think about byte indices vs char indices. This is correct — JavaScript's `.charAt()` has the same subtlety but most developers never notice.

---

### Quick Exercise — In-Memory DNS Cache

**Scenario:** You're building a DNS resolver. Real DNS lookups are slow (~50–200ms). Cache resolved names in memory so repeat queries are instant. Track every query for audit logging.

- Use a `HashMap<String, String>` as your DNS cache (domain → IP address)
- Use a `Vec<String>` to record every query made (including cache hits)
- Write `fn lookup<'a>(cache: &'a HashMap<String, String>, history: &mut Vec<String>, domain: &str) -> &'a str` — checks the cache and returns the IP, or `"NXDOMAIN"` on miss; records the query to history either way
- Pre-populate the cache with 5 real-looking entries (`"example.com" → "93.184.216.34"`, etc.)
- Run 10 queries (with repeats), then print: total queries, cache hits, hit-rate percentage, and the full query history in order

**Read:** Rust Book Ch 8 (Common Collections) · `std::collections` module docs · Search "SipHash denial of service attack" and "Rust HashMap vs BTreeMap when to use"

**Ask AI:** `"How does Rust's HashMap handle hash collisions internally? Why was SipHash chosen as the default hash function instead of something faster like FNV? When should I use BTreeMap instead of HashMap?"`

---

### Tasks — Module 5

**Task 5.1 — Memory Allocator Tracer**
Simulate a simple memory allocator:

- Use a `Vec<(usize, usize)>` as your "allocation table" (start_address, size)
- Implement `allocate(size: usize) -> usize` (returns start address, simulates heap starting at 0x1000)
- Implement `free(address: usize) -> bool` (removes from table, returns false if address not found)
- Implement `fragmentation(&self) -> f64` (ratio of gaps to total heap size)
- Allocate 10 blocks of varying sizes, free every other one, print fragmentation

**Task 5.2 — Assembly-like Register Machine**
Build a simple register machine using HashMap:

- State: `HashMap<String, i64>` (register name → value) and `Vec<i64>` as a stack
- Support instructions: `SET reg value`, `ADD dest src1 src2`, `PUSH reg`, `POP reg`, `PRINT reg`
- Parse and execute a sequence of these instructions from a Vec of strings
- Demo: compute fibonacci(7) using only your register machine

**Task 5.3 — UTF-8 Deep Dive**
Write a program that:

- Creates a string containing ASCII, Latin, and emoji characters (e.g., `"Hello, wörld! 🦀"`)
- Prints: byte count, char count, why they differ
- Prints the raw bytes in hex
- Counts how many bytes each type of character takes
- Explains in comments what "UTF-8 is variable width encoding" means for string indexing performance

---

## Module 6 — Modules, Packages, and Cargo

_Rust Book: Chapter 7 & 14_

### Concept: The Build System as a Hardware Analogy

Think of Cargo as a combination of npm + webpack + Make. But it's also tightly integrated with the Rust compiler, giving you:

- Dependency resolution
- Compilation units (crates)
- Linking
- Testing

```
Workspace
├── Cargo.toml          ← package manifest (like package.json)
├── src/
│   ├── main.rs         ← binary crate root
│   └── lib.rs          ← library crate root
│       ├── module_a.rs
│       └── module_b/
│           ├── mod.rs
│           └── submodule.rs
└── tests/
    └── integration_test.rs
```

**Visibility (`pub`):** In hardware, pins on a chip are either exposed (pub) or internal. Same in Rust — `pub` makes an item visible outside its module. By default, everything is private.

---

### Quick Exercise — Config Loader Library

**Scenario:** You're building a CLI tool. The config loading logic is complex enough to deserve its own module — but callers should only see a clean public API, not the internal line-parsing details.

- Create a library crate with a `config` module in `src/config.rs`
- Inside `config`: a **private** `fn parse_line(line: &str) -> Option<(&str, &str)>` that splits `"key=value"` into a tuple
- Inside `config`: a **public** `fn load(content: &str) -> HashMap<String, String>` that calls `parse_line` on each line, skipping blank lines and lines starting with `#`
- Inside `config`: a **public** `struct Config` with private fields `values: HashMap<String, String>` and public methods `get(&self, key: &str) -> Option<&str>` and `port(&self) -> u16` (defaults to `8080` if `"port"` key is missing)
- In `main.rs`: call `config::load()` on a hardcoded multiline config string and print the resolved port — confirm `parse_line` is not callable from main

**Read:** Rust Book Ch 7 (Packages, Crates, Modules) · The Cargo Book — Package Layout · Rust Reference — Visibility and Privacy

**Ask AI:** `"What is the difference between pub, pub(crate), pub(super), and pub(in path) in Rust? Give me a real-world library scenario where each visibility level is the right choice, and explain what would break if you used a broader visibility than needed."`

---

### Tasks — Module 6

**Task 6.1 — Hardware Abstraction Layer**
Create a Cargo project simulating a Hardware Abstraction Layer (HAL):

- `src/lib.rs` — exports a public `Hal` trait
- `src/gpio.rs` — GPIO (General Purpose I/O) pin simulation
- `src/uart.rs` — UART (serial communication) simulation
- `src/main.rs` — uses both modules
- Each module should be private internally but expose a clean public API
- The UART should support `write_byte(b: u8)` and `read_byte() -> Option<u8>` (simulate with a `VecDeque` buffer)

---

## Tier 1 Final Project — Build a Process Memory Simulator

**Project: `memview`**

Build a command-line tool that simulates a simplified version of `/proc/[pid]/maps` on Linux — the file that shows a process's memory layout.

Requirements:

- Define types for: `MemoryRegion` (start_addr, end_addr, permissions, name)
- Permissions should be an enum with flags for `Read`, `Write`, `Execute`
- Create a `ProcessMemory` struct holding a `Vec<MemoryRegion>`
- Implement methods:
  - `add_region(...)` — add a mapped region
  - `find_region(addr: u64) -> Option<&MemoryRegion>` — find which region contains an address
  - `total_mapped() -> u64` — total bytes mapped
  - `print_map()` — print in `/proc/maps` style format
- Pre-populate it with realistic regions: text segment, data segment, heap, stack, a loaded shared library
- Print the full map, then query a few addresses and show which region they fall in

Example output:

```
00400000-00401000 r-x  [program text]
00600000-00601000 rw-  [program data]
01234000-01334000 rw-  [heap]
7fff0000-80000000 rw-  [stack]
Address 0x00400500 → [program text] (executable, read-only)
Address 0x01280000 → [heap] (read-write)
Address 0xdeadbeef → unmapped
```

---

**When you can complete all tasks and the final project, move to [Tier 2: Intermediate →](./tier2-intermediate.md)**
