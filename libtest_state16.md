# State 16 (17:19)

DEFINITIVE: firstLine="line 999\n", pendingLines=1. Pyodide stdout callback was called exactly once, with ONLY the last line.

This means our stdout registration in runPythonScript is buggy — e.g., it might create the pyodide instance with lineBuffered: true but the stdout callback is attached to... or maybe Pyodide's stdout callback is replaced by our lineBuffered handling such that only the LAST buffered chunk is delivered when the buffer is flushed at exit.

READ runPythonScript / loadPyodide code NOW — the stdout setup section.
