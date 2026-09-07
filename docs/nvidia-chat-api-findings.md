# NVIDIA Chat API findings

Source: https://docs.api.nvidia.com/nim/reference/openai-gpt-oss-20b-infer

The documented request requires `messages` and states that message roles must alternate between `user` and `assistant`; an optional `system` message must be the very first message. The endpoint supports `stream`, `max_tokens` from 1 to 4096, and `reasoning_effort` values `low`, `medium`, and `high`. The documented default model is `openai/gpt-oss-20b`.

Repository implication: the current handlers prepend their own system message while also forwarding caller-supplied system messages, which can produce consecutive system messages and violate the documented request shape. The handlers also use `meta/llama-3.2-90b-vision-instruct` as the vision fallback, while the current NVIDIA model catalog uses the identifier `meta/llama-3_2-90b-vision-instruct`.
