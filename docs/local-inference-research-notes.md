# Local inference research notes

## Ollama

The official Ollama API documentation states that the local API is served by default at `http://localhost:11434/api`. It exposes generation and chat endpoints, an embeddings endpoint, local model listing, model details, pull, push, and delete operations. Official JavaScript and Python libraries are available. Source: https://docs.ollama.com/api/introduction

## llama.cpp

The official `llama.cpp` server documentation states that its server supports OpenAI-compatible chat completions, responses, and embeddings routes. It supports CPU and GPU inference for F16 and quantized models, continuous batching, multimodal support, schema-constrained JSON, function calling/tool use, speculative decoding, monitoring endpoints, and a web UI. Source: https://github.com/ggml-org/llama.cpp/tree/master/tools/server

## Initial implication for ENOSX

Both runtimes can sit behind one ENOSX local companion contract. Ollama is the simpler default for model installation and lifecycle management. llama.cpp is the lower-level fallback for a self-contained packaged runtime, tighter control, and GGUF-focused deployments. ENOSX should use a provider adapter rather than coupling the UI directly to either runtime.
