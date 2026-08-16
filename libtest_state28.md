# State 28 (17:27) — ACCUMULATOR FIX VERIFIED

iso1000: 302 DOM children, windowing ("… 700 older lines omitted"), tail shows line 998/999, head windowed. All 1000 lines captured. FIX WORKS.

Remaining polish: lastOutput is still 0 (setScripts reads store before final flush installs output lines). Fix: when flush sets merged with status done/error, also update the script's lastOutput via setScripts. OR: set lastOutput in flush if merged.status is terminal. Simple approach: after setRun(merged), if merged.status === 'done' or 'error', call setScripts to update lastOutput/exitCode/lastStatus.

Then remove window.__app / __flush2 instrumentation (keep it minimal — actually remove both).
Then: retest lib test → expect ALL STAGES PASSED (up to 3 min for numpy/micropip).
Then remove iso1000 test script from localStorage (cleanup), typecheck, build, commit, push.
Deliverables: docx summary + test script + perf report.
