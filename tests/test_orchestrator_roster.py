import asyncio
import unittest

from config import ALL_WORKERS
from orchestrator import EnosxNemotronBrain


class OrchestratorRosterTest(unittest.TestCase):
    def test_all_34_workers_run_in_bounded_mock_dispatch(self):
        async def dispatch():
            return await EnosxNemotronBrain(mock=True).dispatch(
                "full agent health-check", force_all=True, mock=True
            )

        result = asyncio.run(dispatch())
        workers = [
            worker
            for department in result["results"]
            for worker in department["results"]
        ]

        self.assertEqual(len(ALL_WORKERS), 34)
        self.assertEqual(len(workers), 34)
        self.assertEqual({worker["worker"] for worker in workers}, set(ALL_WORKERS))
        self.assertTrue(all(worker["ok"] for worker in workers))


if __name__ == "__main__":
    unittest.main()
