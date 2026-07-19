---
name: deep-gemm
description: >
  High-performance CUDA tensor core kernel library for NVIDIA GPUs (SM90/SM100).
  Use for: GEMM kernels (FP8, FP4, BF16), fused MoE with overlapped communication,
  MQA scoring, HyperConnection, JIT compilation, GPU optimization, tensor core tuning,
  CUDA kernels, PyTorch CUDA extensions, NVIDIA GPU programming, DGX/H100/H200 optimization,
  DeepSeek model inference, large language model serving, MoE models, Mixture of Experts.
  Also use when: "optimize GPU kernels", "FP8 GEMM", "MoE inference", "CUDA optimization",
  "tensor core performance", "DeepSeek inference", "Mega MoE".
---

# DeepGEMM

High-performance, unified CUDA tensor core kernel library for modern LLM inference and training on NVIDIA GPUs.

## When to Use

- Optimizing GEMM operations for FP8/FP4/BF16 on NVIDIA GPUs (SM90/SM100)
- Implementing Mixture-of-Experts (MoE) inference with fused kernels
- Reducing GPU kernel launch overhead with JIT compilation
- Benchmarking tensor core performance for various matrix shapes
- Deploying DeepSeek models or similar MoE architectures
- Tuning CUDA kernels for H100/H200/H800/A100 GPUs
- Implementing Multi-Query Attention (MQA) scoring for retrieval systems

## Quick Start

### Installation

```bash
# Clone with submodules
git clone --recursive git@github.com:deepseek-ai/DeepGEMM.git
cd DeepGEMM

# Link includes and build JIT module
./develop.sh

# Build and install
./install.sh
```

### Requirements

- NVIDIA GPU with SM90 (H100) or SM100 (H200/B200) architecture
- Python 3.8+
- CUDA 12.3+ (12.9+ recommended for SM90)
- PyTorch 2.1+
- C++20 compiler

### Basic Usage

```python
import torch
from deep_gemm import fp8_gemm_nt

# Allocate FP8 inputs
A = torch.randn((4096, 4096), dtype=torch.float8_e4m3fn, device='cuda')
B = torch.randn((4096, 4096), dtype=torch.float8_e4m3fn, device='cuda').T
C = torch.zeros((4096, 4096), dtype=torch.bfloat16, device='cuda')

# Run FP8 GEMM: D = C + A @ B
fp8_gemm_nt(A, B, C)
```

## API Reference

### Dense GEMMs (Non-Grouped)

| Function | Description |
|----------|-------------|
| `fp8_gemm_nt` | FP8 GEMM, non-transposed A, transposed B: D = C + A @ B.T |
| `fp8_gemm_nn` | FP8 GEMM, both non-transposed |
| `fp8_gemm_tn` | FP8 GEMM, transposed A, non-transposed B |
| `fp8_gemm_tt` | FP8 GEMM, both transposed (SM100 only) |

### Grouped GEMMs (Contiguous Layout)

For MoE training/inference where experts share the same shape:

```python
from deep_gemm import m_grouped_fp8_gemm_nt_contiguous

# Concatenate tokens from all experts into single tensor
# Each expert segment aligned to get_mk_alignment_for_contiguous_layout()
m_grouped_fp8_gemm_nt_contiguous(A, B, C, group_ids, group_count)
```

### Grouped GEMMs (Masked Layout)

For inference with CUDA graphs when CPU doesn't know token distribution:

```python
from deep_gemm import m_grouped_fp8_gemm_nt_masked

# Compute only valid portions using mask
m_grouped_fp8_gemm_nt_masked(A, B, C, mask)
```

### Mega MoE (Fused MoE Kernel)

Fuses and overlaps EP dispatch, linear 1 (FP8xFP4), SwiGLU, linear 2 (FP8xFP4), and EP combine:

```python
import torch
from deep_gemm import (
    get_symm_buffer_for_mega_moe,
    transform_weights_for_mega_moe,
    fp8_fp4_mega_moe
)

# 1. Allocate symmetric memory buffer (requires PyTorch >= 2.9)
buffer = get_symm_buffer_for_mega_moe(
    group, num_experts, num_max_tokens_per_rank, num_topk, hidden, intermediate_hidden
)

# 2. Transform weights (FP4 with UE8M0 scaling factor)
transformed_l1, transformed_l2 = transform_weights_for_mega_moe(l1_weights, l2_weights)

# 3. Copy inputs into buffer
buffer.x[:num_tokens].copy_(x_fp8)
buffer.x_sf[:num_tokens].copy_(x_sf)
buffer.topk_idx[:num_tokens].copy_(topk_idx)
buffer.topk_weights[:num_tokens].copy_(topk_weights)

# 4. Run fused mega MoE kernel
y = torch.empty((num_tokens, hidden), dtype=torch.bfloat16, device='cuda')
fp8_fp4_mega_moe(y, transformed_l1, transformed_l2, buffer)
```

### MQA Scoring Kernels (Lightning Indexer)

For DeepSeek v3.2 MQA scoring:

```python
from deep_gemm import fp8_mqa_logits, fp8_paged_mqa_logits

# Non-paged version (for prefilling)
out = fp8_mqa_logits(q, kv, weights, cu_seq_len_k_start, cu_seq_len_k_end, clean_logits)
# Output shape: [seq_len, seq_len_kv]
```

## Utilities

```python
from deep_gemm import (
    set_num_sms, get_num_sms,          # Set/get max SM count
    set_tc_util, get_tc_util,           # Tensor core utilization ratio
    set_pdl, get_pdl,                   # Enable/disable PDL
    get_mk_alignment_for_contiguous_layout,
    get_theoretical_mk_alignment_for_contiguous_layout,
    set_ignore_compile_dims,
    set_block_size_multiple_of,
    transform_sf_into_required_layout,
    get_tma_aligned_size,
    get_mn_major_tma_aligned_tensor,
    get_mn_major_tma_aligned_packed_ue8m0_tensor,
    get_k_grouped_mn_major_tma_aligned_packed_ue8m0_tensor,
)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DG_JIT_DEBUG` | 0 | Print JIT debugging info |
| `DG_PRINT_CONFIGS` | 0 | Print selected configs per shape |
| `DG_JIT_CACHE_DIR` | `$HOME/.deep_gemm` | JIT compiled kernels cache |
| `DG_JIT_USE_NVRTC` | 0 | Use NVRTC instead of NVCC (faster compilation) |
| `DG_JIT_NVCC_COMPILER` | torch CUDA_HOME | NVCC compiler path |
| `DG_JIT_CPP_STANDARD` | 20 | C++ standard version |
| `DG_JIT_PRINT_COMPILER_COMMAND` | 0 | Print compilation commands |
| `DG_JIT_PTXAS_VERBOSE` | 0 | Show detailed PTXAS output |
| `DG_JIT_PTXAS_CHECK` | 0 | Assert no local memory in compiled kernels |
| `DG_JIT_PRINT_LOAD_TIME` | 0 | Print kernel load time |
| `DG_JIT_WITH_LINEINFO` | 0 | Embed source line info for profiling |
| `DG_JIT_DUMP_ASM` | 0 | Dump PTX and SASS |
| `DG_JIT_DUMP_PTX` | 0 | Dump PTX output |
| `DG_JIT_DUMP_SASS` | 0 | Dump SASS output |
| `DG_COMM_KERNEL_DEBUG` | 0 | Zero symmetric buffer before Mega MoE call |
| `DG_SKIP_CUDA_BUILD` | 0 | Skip CUDA extension build |
| `DG_FORCE_BUILD` | 0 | Force local build |
| `DG_JIT_USE_RUNTIME_API` | 0 | Use CUDA Runtime API (requires CUDA >= 12.8) |

## Key Concepts

### Memory Layout Convention

- Naming: `D = C + A @ B` (input layout is NT)
- LHS scaling factor: TMA-aligned and transposed layout
- **SM90**: FP32 scaling factors, NT layout only
- **SM100**: Packed UE8M0 format (4 UE8M0 per torch.int), all layouts supported (NT, TN, NN, TT)

### Grouped GEMM M-Axis Grouping

- Groups only the M-axis; N and K must remain fixed
- Designed for MoE experts sharing the same shape
- Each expert segment must align to `get_mk_alignment_for_contiguous_layout()`

### JIT Compilation

DeepGEMM compiles kernels at runtime via a lightweight JIT CPP module:
- No CUDA compilation during installation
- Compiles kernels per-shape for optimal performance
- Cache location: `$HOME/.deep_gemm`

## Performance Notes

- Achieves up to **1550 TFLOPS** on H800
- Performance matches or exceeds expert-tuned libraries (CUTLASS)
- Runtime JIT compilation ensures shape-specific optimization
- Mega MoE overlaps NVLink communication with tensor core computation

## Troubleshooting

### Compilation Failures
- Ensure CUDA 12.3+ (12.9+ for SM90)
- Verify C++20 compiler support
- Check submodule initialization: `git submodule update --init --recursive`

### Performance Issues
- Set `DG_JIT_USE_NVRTC=1` for faster compilation (may have performance loss)
- Tune `set_num_sms()` for your GPU architecture
- Check TMA alignment: `get_tma_aligned_size()`

### Memory Errors
- Verify GPU architecture: SM90+ required
- For Mega MoE: requires symmetric memory setup with multi-process launch
- Check PyTorch version for Mega MoE: >= 2.9 required

## References

- GitHub: https://github.com/deepseek-ai/DeepGEMM
- Inspired by CUTLASS and CuTe
- MIT License
