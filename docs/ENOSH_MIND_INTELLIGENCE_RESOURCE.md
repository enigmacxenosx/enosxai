# ENOSH MIND Intelligence-Training Resource

## Purpose

ENOSH MIND can provide original practice activities covering broad intelligence-training categories: verbal aptitude, numerical aptitude, logical reasoning, creativity, reflective personality prompts, and memory. These activities are intended for learning, practice, and structured thinking rather than diagnosis.

The uploaded reference was identified as *The Complete Book of Intelligence Tests* by Philip Carter, published by John Wiley & Sons Ltd. Its front matter states that it is copyrighted and that reproduction, storage, transmission, scanning, and related copying require permission or an applicable licence. The repository therefore does **not** include the PDF, its exercises, answer key, or reproduced passages.

## Product behavior

When ENOSH MIND receives a request for intelligence practice, it should generate new, non-substitutive questions; explain the reasoning after the user answers; offer difficulty levels; and identify the skill being practiced. It should not claim that an informal score is a clinical IQ result, and it should recommend a qualified professional for psychological assessment.

## Access control

ENOSH MIND remains a paid tier. The API checks the account's persisted subscription entitlement before serving it. GOD MODE is an operator interface and does not grant a subscription. A phrase such as `enosxenoshmnd`, a prompt injection, or a client-side mode selection cannot unlock ENOSH MIND.

If the deployment needs a non-paying founder/operator account, configure the server-only environment variables `ENOSX_MIND_OPERATOR_USER_IDS` and/or `ENOSX_MIND_OPERATOR_EMAILS` with an explicit allowlist. Never put these values in `VITE_` variables, localStorage, frontend code, or chat prompts.
