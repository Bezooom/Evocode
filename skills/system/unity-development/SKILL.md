---
name: unity-development
domain: general
pack: general
tier: optional
triggers:
  - unity development
description: "[RU] Макро-навык для разработки на Unity от TheOne Studio. Включает архитектурные паттерны (UniTask, VContainer, DOTS/ECS), строгие стандарты C# (качество, логгирование), выбор MCP-инструментов и жесткие правила код-ревью.
[EN] Comprehensive guide for Unity development. Provides architecture patterns, DOTS/ECS guidelines, strict TheOne Studio C# standards (quality, VContainer, logging), MCP tool selection, and code review rules."
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Unity Development Guide & TheOne Standards

A comprehensive guide for Unity development combining high-performance architectural patterns (like **Wild Field RTS** using DOTS/ECS) with the strict **TheOne Studio C# Development Standards**. This skill serves as an **always-referenced parent skill** for any Unity-related tasks, code generation, refactoring, or code review.

⚠️ **Unity 6 (C# 9):** All patterns and examples are compatible with Unity 6 (C# 9).

---

## 🔴 PRIORITY 1: CRITICAL Code Quality Rules (CHECK FIRST!)

**ALWAYS enforce these BEFORE writing any code:**

1. **Enable nullable reference types** - No nullable warnings allowed (`#nullable enable`).
2. **Use least accessible access modifier** - `private` by default.
3. **Fix ALL warnings** - Zero tolerance for compiler warnings.
4. **Throw exceptions for errors** - NEVER log errors; throw exceptions instead.
5. **TheOne.Logging.ILogger for runtime** - No conditional guards (`#if`), no prefixes (`[prefix]`), NEVER in constructors; `Debug.Log` ONLY for editor scripts.
6. **Use readonly for fields** - Mark fields that aren't reassigned.
7. **Use const for constants** - Constants should be `const`, not `readonly`.
8. **Use nameof for strings** - Never hardcode property/parameter names.
9. **Using directive in deepest scope** - Method-level `using` when possible.
10. **No inline comments** - Use descriptive names; code should be self-explanatory.

```csharp
// ✅ EXCELLENT: All quality rules enforced
#nullable enable

public sealed class PlayerService
{
    private readonly TheOne.Logging.ILogger logger;
    private const int MaxHealth = 100;

    public PlayerService(TheOne.Logging.ILogger logger)
    {
        this.logger = logger;
    }

    public Player GetPlayer(string id)
    {
        using System.Text.Json;
        return players.TryGetValue(id, out var player)
            ? player
            : throw new KeyNotFoundException($"Player not found: {nameof(id)}={id}");
    }
}
```

---

## 🟡 PRIORITY 2: Modern C# Patterns

- **LINQ over loops**: `var activeEnemies = allEnemies.Where(e => e.IsActive).ToList();`
- **Expression bodies**: `public int Health => this.currentHealth;`
- **Null-coalescing**: `var name = playerName ?? "Unknown";`
- **Pattern matching**: `if (obj is Player player) player.TakeDamage(10);`

---

## 🟢 PRIORITY 3: Unity Architecture Patterns

### 1. DOTS & ECS (High-Performance / RTS Standard)

**Use Unity Data-Oriented Technology Stack (ECS, Burst, Jobs) for all mass gameplay simulation.**
- **Never** use `GameObject` for units, buildings, or projectiles. Use `Entity`.
- Use `EntityCommandBuffer` (ECB) for structural changes (spawning, dying).
- Use `VFX Graph` combined with `Graphics.DrawMeshInstancedIndirect` for rendering thousands of units.
- Use Deterministic Math (no floats where network synchronization is required).

```csharp
using Unity.Entities;
using Unity.Transforms;
using Unity.Burst;
using Unity.Mathematics;

public struct UnitStats : IComponentData {
    public float Speed;
}

[BurstCompile]
public partial struct MovementSystem : ISystem {
    [BurstCompile]
    public void OnUpdate(ref SystemState state) {
        float deltaTime = SystemAPI.Time.DeltaTime;
        foreach (var (transform, stats) in SystemAPI.Query<RefRW<LocalTransform>, RefRO<UnitStats>>()) {
            transform.ValueRW.Position += new float3(0, 0, stats.ValueRO.Speed * deltaTime);
        }
    }
}
```

### 2. Dependency Injection (VContainer / TheOne.DI)

**Choose ONE stack per project:**
- **VContainer + SignalBus**: Use `[Preserve]` on constructors, `Lifetime.Singleton/Scoped`.
- **TheOne.DI + Publisher/Subscriber**: Use `[Inject]` on constructors, `IPublisher<T>`.

**Universal Rules:**
- Use **Data Controllers** (NEVER direct data access).
- Unload assets in `Dispose`.
- `TheOne.Logging.ILogger` for runtime, `Debug.Log` for editor only.

```csharp
using UnityEngine.Scripting;
using VContainer.Unity;

public sealed class GameService : IInitializable, IDisposable
{
    private readonly SignalBus signalBus;

    [Preserve]
    public GameService(SignalBus signalBus) {
        this.signalBus = signalBus;
    }

    void IInitializable.Initialize() { this.signalBus.Subscribe<WonSignal>(this.OnWon); }
    void IDisposable.Dispose() { this.signalBus.TryUnsubscribe<WonSignal>(this.OnWon); }
}
```

### 3. Fail-Fast & Component Access

**Do not write null checks. Use objects directly when their existence is assumed.**
```csharp
// NG: Forbidden
if (component != null) { component.DoSomething(); }

// OK: Direct usage
GetComponent<Rigidbody>().velocity = Vector3.zero;
```

**No GetComponent in Update.** Cache it in `Awake`.

### 4. UniTask Patterns

**Use UniTask instead of coroutines. `async void` is forbidden.**
```csharp
using Cysharp.Threading.Tasks;
using System.Threading;

// OK: UniTaskVoid + destroyCancellationToken
async UniTaskVoid Start() {
    await UniTask.Delay(1000, cancellationToken: destroyCancellationToken);
}
```

---

## 🔵 PRIORITY 4: Code Review Checklist

### ❌ DON'T (Critical Severities):
1. **Ignore nullable warnings** → Enable `#nullable` and fix all warnings.
2. **Log errors instead of throwing** → Throw exceptions for errors.
3. **Use Debug.Log in runtime code** → Use `TheOne.Logging.ILogger` (`Debug.Log` is editor only).
4. **Add conditional guards to logs** → `ILogger` handles `#if` internally.
5. **Add manual log prefixes** → `ILogger` handles `[prefix]` automatically.
6. **Log in constructors** → Never log in constructors (keep fast/side-effect free).
7. **Use logger?.Method()** → Use `logger.Method()` (DI guarantees non-null).
8. **Skip access modifiers** → Always use least accessible (`private` default).
9. **Leave fields mutable** → Use `readonly/const` where possible.
10. **Forget to unsubscribe from signals** → Implement `IDisposable`.
11. **Add inline comments** → Use descriptive names instead.

---

## MCP Tool Categories & Workflows

### C# Code Editing Tools
- `edit_snippet`: Lightweight edit within 80 characters.
- `edit_structured`: Method body replacement, member addition.
- `get_symbols` / `find_symbol` / `find_refs`: Search before refactoring.

### Scene & Asset Operations
- `create_gameobject` / `add_component` / `modify_component`
- `create_prefab` / `instantiate_prefab` / `addressables_manage`

### PlayMode Testing
- `play_game` / `stop_game` / `input_keyboard` / `run_tests`

### Workflow Example: Create ECS System
```javascript
// Create System script
mcp__unity-mcp-server__create_class({
  path: "Assets/Scripts/Systems/MovementSystem.cs",
  className: "MovementSystem",
  usings: "Unity.Entities,Unity.Burst,Unity.Transforms,Unity.Mathematics"
})

// Add Burst-compiled implementation
mcp__unity-mcp-server__edit_structured({
  path: "Assets/Scripts/Systems/MovementSystem.cs",
  symbolName: "MovementSystem",
  operation: "insert_after",
  newText: `
    [BurstCompile]
    public partial struct MovementSystem : ISystem {
        [BurstCompile]
        public void OnUpdate(ref SystemState state) { /* ... */ }
    }
`
})
```

---

## Quick Decision Tree

```
Unity Development Task
├─ Need code editing?
│   ├─ YES → Validate Code Quality Checklist → edit_snippet / edit_structured
│   └─ NO → Next
├─ Need scene/GameObject operations?
│   ├─ YES → create_gameobject / add_component
│   └─ NO → Next
├─ Need UI implementation?
│   ├─ Game UI → unity-game-ugui-design or unity-game-ui-toolkit-design
│   └─ Editor UI → unity-editor-imgui-design
└─ Need testing/verification?
    └─ YES → play_game / run_tests
```