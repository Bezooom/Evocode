# Hardware profiles & model tuning (target **v1.0.0**)

**Status:** foundation in Core (`GET /v1/hardware`, `src/core/hardware.ts`) · full first-run wizard → **1.0 DoD**  
**Related:** [RUNTIME.md](../docs/RUNTIME.md), `config/profiles.json`, dual-model FIM

---

## Problem

Local AI-IDE quality depends on the machine:

| Resource | Wrong default | Symptom |
|----------|---------------|---------|
| VRAM | embed/FIM on GPU + 35B chat | `cudaMalloc` OOM, «port up but silent» |
| Context | 262k on 24GB with other GPU models | OOM or crash loop |
| CPU threads | `-t 1` or `-t 36` | slow FIM / thrashing |
| Thinking models | unlimited reasoning budget | empty `content`, agent **AbortError** |
| RAM | huge batch + parallel | system freeze |

Evocode must **detect hardware**, **recommend** chat/FIM/embed setup, and **expose knobs** — not hard-code one developer’s box.

---

## v1.0 scope (DoD)

### H1 — Detect

| Signal | Source |
|--------|--------|
| CPU model / logical cores | `os.cpus()`, `/proc/cpuinfo` |
| RAM total/free | `os.totalmem` / `freemem` |
| NVIDIA GPUs + VRAM | `nvidia-smi` (optional) |
| Free ports 8080/8082/8083/8084 | probe |
| Existing binaries/models from profiles | path exists |

**API (shipped early):** `GET /v1/hardware` → `{ tier, cpu, memory, gpus, recommendations }`.

Tiers: `minimal` · `dev` · `workstation` · `beast`.

### H2 — Recommend

Return structured advice:

- `chatClass` (e.g. 35B Q4 GPU)
- `chatCtxHint`
- `cpuThreads` for FIM/embed (≈ half of logical cores, cap 16)
- `secondaryOnCpu: true` when VRAM reserved for chat
- `suggestedProfiles[]`
- `tunables[]` (`-t`, `-ngl`, `--ctx-size`, `--reasoning-budget`)

### H3 — Apply (1.0 UI)

Product panel / first-run:

1. Run probe  
2. Show tier + recommendations (RU)  
3. One-click: write `config/profiles.local.json` or patch defaults  
4. Restart runtime profiles (stop/start)  

No GGUF download required for MVP of H3 — only path/args suggestions.

### H4 — Guardrails at runtime

| Guard | Behavior |
|-------|----------|
| Reasoning budget | chat profiles default `--reasoning-budget 512` |
| Fold reasoning | Core maps empty `content` ← `reasoning_content` (`EVOCODE_FOLD_REASONING`) |
| VRAM policy | FIM/embed default `-ngl 0` when chat is 30B+ GPU |
| Abort mapping | clear `type: aborted` + hints instead of bare UnknownError |

---

## Recommended defaults by tier (summary)

| Tier | VRAM | Chat | FIM/embed | ctx chat |
|------|------|------|-----------|----------|
| minimal | none / &lt;6G | small CPU or cloud | FIM CPU | 8k |
| dev | 6–12G | 7–14B GPU | CPU `-t` ~8–12 | 16k |
| workstation | 12–16G | 14–32B + fit | CPU | 32k |
| beast | ≥22G | 30–35B GPU | CPU `-t` 12–16 | 128k–262k if VRAM free |

Your pilot box (~36 threads, 24GB class): **beast** — chat GPU, FIM+embed CPU, `-t 12–16`, reasoning budget on.

---

## Operator knobs (today)

```bash
# See recommendation
curl -s localhost:8083/v1/hardware | jq .

# Fold thinking into content for agents (default true)
EVOCODE_FOLD_REASONING=true

# profiles.json
# -t 16          # CPU FIM/embed
# -ngl 0         # secondary models
# --reasoning-budget 512
```

---

## Implementation checklist

- [x] `src/core/hardware.ts` probe + recommend  
- [x] `GET /v1/hardware`  
- [x] reasoning fold + abort message  
- [x] profiles: reasoning-budget, FIM/embed `-t 16`  
- [ ] Product panel «Железо» tab (1.0)  
- [ ] First-run wizard apply profiles.local  
- [ ] Auto-pick profile after probe  
- [ ] Optional: ROCm / Apple Metal detect  

---

## Non-goals

- Auto-download multi‑GB GGUF without consent  
- Benchmark every model on every start  
- Replace manual `profiles.json` for power users  
