---
name: rust-pro
domain: general
pack: general
tier: optional
triggers:
  - rust pro
description: Master Rust 1.75+ development with async runtime (Tokio/smol).
category: development
version: 4.1.0-fractal
layer: master-skill
---

# Rust Professional Development

> **Goal**: Write idiomatic, high-performance, and memory-safe Rust code following standard community practices (The Rust Way).

## 1. Core Principles

- **Ownership & Borrowing**: strictly enforce ownership rules. Avoid `.clone()` unless necessary. Use `Arc<Mutex<T>>` or `RwLock<T>` for shared state only when message passing (`mpsc`) is not viable.
- **Error Handling**: Use `Result<T, E>` with `thiserror` for libraries and `anyhow` for applications. Never use `.unwrap()` in production code; use `.expect()` with a context message or `?` operator.
- **Async Runtime**: Default to `tokio` for general purpose apps. Use `join_all` for parallel execution of futures.
- **Type System**: Leverage traits and generics for zero-cost abstractions. Use `New Type` pattern to enforce validation at compile time.

## 2. Toolchain & Ecosystem

- **Build System**: `cargo`
- **Linter**: `clippy` (Treat warnings as errors in CI)
- **Formatter**: `rustfmt`
- **Testing**: Built-in `#[test]` and `cargo test`. Use `mockall` for mocking traits.

## 3. Recommended Project Structure

```text
my_crate/
├── Cargo.toml
├── src/
│   ├── main.rs          # Binary entry point
│   ├── lib.rs           # Library entry point
│   ├── bin/             # Additional binaries
│   ├── models/          # Data structures
│   ├── error.rs         # Central error definition
│   └── utils.rs         # Helper functions
└── tests/               # Integration tests
    └── integration_test.rs
```

## 4. Common Dependencies (The Standard Stack)

- **Async**: `tokio`, `futures`
- **Web**: `axum` or `actix-web`
- **Serialization**: `serde`, `serde_json`
- **Error Handling**: `anyhow`, `thiserror`
- **Tracing/Logging**: `tracing`, `tracing-subscriber`
- **config**: `config` crate for environment management

## 5. Security & Performance

- **Memory**: Use `String` only when ownership is needed; prefer `&str` for function arguments.
- **Unsafe**: Avoid `unsafe` blocks unless absolutely necessary and documented with `// SAFETY:` comment explaining why it holds.
- **Vectors**: Pre-allocate vectors with `Vec::with_capacity(n)` if size is known.

## 6. Implementation Workflow

1.  **Define Types**: Start with `struct` and `enum` definitions.
2.  **Define Traits**: Outline behavior using traits.
3.  **Implement Logic**: Implement traits for types.
4.  **Wire up**: Connect components in `main.rs` or `lib.rs`.
5.  **Test**: Write unit tests alongside code and integration tests in `tests/`.

---

**Anti-Patterns to Avoid**:
- Excessive use of `Box<dyn Trait>` (prefer generics with static dispatch).
- Ignoring `Result` (always handle or propagate).
- Global mutable state (use dependency injection or actor pattern).
