---
name: reverse-engineering
domain: general
pack: general
tier: optional
triggers:
  - reverse engineering
description: [RU] Навык для реверс-инжиниринга: статический и динамический анализ бинарников, деобфускация, обход анти-отладки, анализ кастомных VM. Используй при запросах "исследовать бинарник", "взломать crackme", "деобфусцировать код", "реверс-инжиниринг", "понять как работает программа", "снять дамп памяти", а также при работе с дизассемблерами (Ghidra, radare2, IDA) и отладчиками (GDB). [EN] Reverse engineering skill: static/dynamic analysis, deobfuscation, anti-debug bypass, custom VM analysis. Use when user asks to reverse a binary, crack a program, deobfuscate code, use Ghidra/radare2/GDB, or analyze malware/CTF challenges.
---

# Reverse Engineering

Comprehensive reverse engineering toolkit and methodologies for analyzing compiled binaries, bypassing anti-analysis techniques, and solving CTF challenges.

## Quick start

```bash
# Basic triage
file binary
checksec --file=binary
strings binary | grep -iE "flag|secret|password"

# Radare2 fast debug
r2 -d ./binary
aaa
pdf @ main
```

## Workflows

1. **Initial Reconnaissance**: Extract strings, check file type, use `strace`/`ltrace`.
2. **Dynamic Analysis**: Use GDB/pwndbg to step through execution. Set breakpoints at comparisons.
3. **Static Analysis**: Decompile with radare2 or Ghidra headless if complex logic is present.
4. **Anti-Analysis Bypass**: Patch out `ptrace` checks or use `LD_PRELOAD` hooks.
5. **Pattern Recognition**: Identify cryptography, VMs, or encoding mechanisms.

## Advanced features

For detailed methodologies, refer to the bundled resources:
- [Static Tools](tools.md) - GDB, radare2, Ghidra, Unicorn, WASM, APK, .NET
- [Dynamic Tools](tools-dynamic.md) - Frida, angr, Qiling, trace reconstruction
- [Advanced Tools](tools-advanced.md) - VMProtect, Binary Diffing, Deobfuscation
- [Anti-Analysis](anti-analysis.md) - Anti-debug, Anti-VM, SMC, Obfuscation
- [Common Patterns](patterns.md) - Custom VMs, Signal handlers, Keystreams
- [CTF Patterns 1](patterns-ctf.md) - Specific CTF reverse patterns
- [CTF Patterns 2](patterns-ctf-2.md) - More competition specific patterns
- [CTF Patterns 3](patterns-ctf-3.md) - Advanced CTF specific patterns
- [Language Specifics](languages.md) - Python, WASM, Brainfuck, transpilation
- [Compiled Languages](languages-compiled.md) - Go, Rust, Swift, C++, Haskell
- [Platforms](platforms.md) - iOS, Embedded, Kernel drivers, Android
- [Field Notes](field-notes.md) - Quick reference for specific scenarios

## When to Pivot

- If target is a web app helper script, switch to `/ctf-web` or web exploitation.
- If memory/disk artifacts recovery, switch to `/ctf-forensics`.
- If binary is fully understood and needs ROP/Heap exploitation, switch to `/ctf-pwn`.
- If core logic is pure cryptography, switch to `/ctf-crypto`.
