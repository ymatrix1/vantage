# Spike: native spool hook (Go and Rust)

Throwaway measurement code for bean `vantage-xex6` (D67, Q28). **Not shipped and not registered.** It mirrors `packages/hooks/src/collect.ts`: read one JSON object from stdin, append `{"v":1,"receivedAt":<ISO>,"hook":<object>}` as one line to `$VANTAGE_HOME/spool/<day>.jsonl`, exit 0 on any error.

Run (needs Go, Rust and a built `packages/hooks/dist`): `node tools/spike-native-hook/bench.mjs`. Results: [research note](../../docs/research/native-hook-binary.md).
