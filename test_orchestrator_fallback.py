"""Regression tests for user-visible worker diagnostics when synthesis fails."""
from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from orchestrator import _fallback_synthesis


class FallbackDiagnosticsTests(unittest.TestCase):
    def test_lists_each_worker_error_and_redacts_credentials(self) -> None:
        failures = [
            {
                "worker": f"worker_{index}",
                "model": f"provider/model-{index}",
                "ok": False,
                "error": f"HTTP Error 401: token sk-test-secret rejected for worker {index}",
            }
            for index in range(14)
        ]
        with patch.dict(os.environ, {"NVIDIA_API_KEY": "sk-test-secret"}, clear=False):
            output = _fallback_synthesis([{"results": failures}])

        self.assertIn("14 worker(s) reported an error", output)
        for index in range(14):
            self.assertIn(f"worker_{index} (provider/model-{index})", output)
        self.assertNotIn("sk-test-secret", output)
        self.assertIn("[REDACTED]", output)


if __name__ == "__main__":
    unittest.main()
