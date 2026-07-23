import * as fs from 'fs';
import * as path from 'path';
import { defaultDatasetCollector, DatasetCollector } from './dataset-collector';

export interface AdapterConfig {
  maxExamples: number;
  adapterName: string;
}

export class InContextAdapter {
  private collector: DatasetCollector;
  private adapterDir: string;

  constructor(collector?: DatasetCollector, customDir?: string) {
    this.collector = collector || defaultDatasetCollector;
    this.adapterDir = customDir || path.join(process.cwd(), '.evocode', 'learning', 'adapters');
    this.ensureDir();
  }

  private ensureDir(): void {
    try {
      if (!fs.existsSync(this.adapterDir)) {
        fs.mkdirSync(this.adapterDir, { recursive: true });
      }
    } catch {
      /* ignore directory creation error */
    }
  }

  public buildAdapterPromptSnippet(maxExamples: number = 3): string {
    const recent = this.collector.getRecentItems(maxExamples * 2);
    if (recent.length === 0) return '';

    // Take top distinct interactions
    const selected = recent.slice(-maxExamples);
    const examples = selected.map((item, idx) => {
      const p = item.prompt.length > 250 ? item.prompt.slice(0, 250) + '...' : item.prompt;
      const r = item.response.length > 350 ? item.response.slice(0, 350) + '...' : item.response;
      return `Example ${idx + 1}:\nUser: ${p}\nAssistant Code/Style: ${r}`;
    });

    return `[IN-CONTEXT MODEL ADAPTER / АДАПТИВНЫЙ СЛОЙ ОБУЧЕНИЯ]
Ниже приведены примеры успешного стиля ответов и паттернов программирования оператора:

<in_context_adapter_examples>
${examples.join('\n\n')}
</in_context_adapter_examples>`;
  }

  public generateLoraTrainingScript(): string {
    const stats = this.collector.getStats();
    const scriptPath = path.join(process.cwd(), 'scripts', 'export-lora-dataset.sh');
    const scriptContent = `#!/usr/bin/env bash
# Evocode LoRA Dataset Exporter & Trainer Script
set -euo pipefail

DATASET_FILE="${stats.datasetPath}"
OUTPUT_LORA_DIR="${path.join(process.cwd(), '.evocode', 'learning', 'lora')}"

mkdir -p "$OUTPUT_LORA_DIR"

echo "=== Evocode LoRA Trainer ==="
echo "Dataset: $DATASET_FILE (${stats.count} samples)"
echo "Target LoRA output: $OUTPUT_LORA_DIR"

if [ ! -f "$DATASET_FILE" ]; then
  echo "Error: dataset file not found at $DATASET_FILE"
  exit 1
fi

echo "Dataset is ready for llama.cpp finetune / Unsloth / QLoRA training."
`;

    try {
      const scriptsDir = path.join(process.cwd(), 'scripts');
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
    } catch {
      /* ignore */
    }

    return scriptPath;
  }
}

export const defaultInContextAdapter = new InContextAdapter();
