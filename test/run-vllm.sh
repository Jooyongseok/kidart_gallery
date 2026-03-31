#!/bin/bash
# ============================================================
# KidArt Gallery — vLLM 서버 시작 스크립트
# ============================================================
# GPU 1장만 사용 (인덱스 3번)
# 포트: 8100
# ============================================================

export CUDA_VISIBLE_DEVICES=3

echo "🚀 Qwen2.5-VL-7B vLLM 서버 시작 중..."
echo "   GPU: $CUDA_VISIBLE_DEVICES"
echo "   Port: 8100"
echo ""

conda run -n kidart python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-VL-7B-Instruct \
  --max-model-len 32768 \
  --port 8100 \
  --trust-remote-code \
  --gpu-memory-utilization 0.6 \
  --mm-processor-kwargs '{"max_pixels": 1003520}'
