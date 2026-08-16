# State 24 (17:23)

Even after full cache bust + new chunk BngMRDmN: still 1 line. Console repro with identical options gives 1000. The difference must be in how the app invokes execution (e.g., TerminalWindow's run handler transforms the script, or useScriptRuntime's runScript path differs from runPythonScript I think I know). READ TerminalWindow.tsx to find the Run click handler.
