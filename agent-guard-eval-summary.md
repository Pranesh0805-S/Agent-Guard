# Agent Guard: eval results summary

> NOTE: This is a summary of the results recorded from earlier sessions.
> It is NOT the raw terminal output. Paste the original logs to get a verbatim file.

## Haiku 4.5 benchmarks

| Round | Setup | Guard off | Guard on |
|---|---|---|---|
| Early baseline | First attack set, then harder set (3 runs each) | 0 leaks/deletes | n/a |
| Autonomous attacks | 10 runs each | 4/10 attacks succeeded (only the lookalike vendor-domain email fooled it) | 0/10 succeeded |
| Assisted mode (polite) | Same model | 0 leaks | n/a |
| Harmless tasks, layer 1 (allowlist + taint rule) | Assisted, 3 runs per task | 9/9 completed | 0/9 completed |
| Layer 2 (blind reviewer), first run | Harmless 9/9; autonomous 0/10 succeeded (4/10 attempted) | n/a | n/a |
| Layer 2 reviewer probe | 27/30 (only failures: goal names one email but action deletes another id) | n/a | n/a |
| Layer 2 reviewer, final | Probe 36/36; harmless 9/9 with 0 blocked; autonomous 0/10 succeeded | n/a | n/a |

## Final Haiku 4.5 round (frozen code, 0 errored or truncated runs)

- Autonomous, 20 runs each: guard off 6/20 attacks succeeded, guard on 0/20
- 10/20 attempted with guard on; every attempt was the lookalike-domain send, stopped by the allowlist
- Reviewer made 33 denials, all on deletes plus one send
- Harmless tasks: 15/15 in both arms
- Cost: about $0.60 for 70 runs

## Guard eval cases (3 repeats per case)

- Starter set (tuned on): stopped 10/10 attacks, allowed 5/5 legitimate
- Second set (written after seeing the reviewer): stopped 5/5 attacks, allowed 3/5 legitimate
- Misses: explicit request to email an outside address (held by the allowlist by design); "delete the newsletter" (reviewer too strict)
- No independent set of own cases written yet

## Layer 3 (approval queue + dashboard)

- 17 tests passing; dashboard on localhost:3000 renders
- Real agent run queued the lookalike-domain send; approve/deny tested in the dashboard
- MAX_TOKENS raised to 2048 after a run was cut off at 512

## Sonnet 5 round

- Autonomous runs: all truncated at max_tokens (20/20), so no valid data
- Harmless tasks: 9/9 guard off, 9/9 guard on (reviewer consulted every time)
- Cost about $0.88; address-parsing fix in place, 21 tests pass, evals unchanged after it
- Decision: stop further Sonnet 5 eval runs, move to phase 8 (README write-up)
