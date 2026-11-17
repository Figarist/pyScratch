## Summary

<!-- Describe what this Pull Request implements or fixes, and link any related issue(s). -->

## Related `TODO.md` Item(s)

<!-- List the section/item(s) from TODO.md addressed by this PR. -->
- 

## Checklist

- [ ] Targets specific item(s) from [`TODO.md`](TODO.md) (and updates `[ ]` → `[x]` where complete)
- [ ] **Compiler & Decompiler parity**: Implemented in `js/compiler.js` and `js/decompiler.js` (including Ukrainian `formatBlockUk` label) with 100% round-trip idempotency
- [ ] **`StagePreview` runtime support**: Matching simulation behavior implemented in `js/preview.js`
- [ ] **Documentation updated**: [`docs/DSL_REFERENCE.md`](docs/DSL_REFERENCE.md) updated for any new or modified DSL syntax / opcodes
- [ ] **Tests passing**: Added round-trip and runtime tests and verified `node test/test_roundtrip.js` (`npm test`) passes cleanly
