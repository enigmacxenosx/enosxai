# State 19 (17:21)

Key facts:
- Fresh chunk TerminalWindow-BngMRDmN.js IS loaded (has lineBuffered:!0).
- Direct console Pyodide test: lineBuffered false OR true → 20 callbacks each. So buffering NOT the cause!
- Therefore the app run's "single line" comes from something else in the app pipeline.

Next: inspect iso1000.py stored content — maybe the injected script is corrupted and genuinely prints only "line 999".
