"""Offline regression tests for hosted NVIDIA Flux image workers."""
from __future__ import annotations

import base64
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from config import NVIDIA_IMAGE_BASE_URL
from workers.common import Worker


class ImageWorkerTests(unittest.IsolatedAsyncioTestCase):
    async def test_flux_workers_use_model_specific_routes_and_payloads(self) -> None:
        cases = (
            ("high_quality_image_gen", "black-forest-labs/flux.1-dev", 50, 3.5),
            ("fast_draft_image_gen", "black-forest-labs/flux.1-schnell", 4, None),
        )
        image_bytes = b"test-image-bytes"
        encoded = base64.b64encode(image_bytes).decode("ascii")

        for worker_name, model, steps, cfg_scale in cases:
            with self.subTest(worker=worker_name), tempfile.TemporaryDirectory() as directory:
                mocked_request = AsyncMock(
                    return_value={"artifacts": [{"base64": encoded, "finishReason": "SUCCESS"}]}
                )
                with (
                    patch.dict(os.environ, {"NVIDIA_IMAGE_ENDPOINT": ""}, clear=False),
                    patch("workers.common._http_json", new=mocked_request),
                    patch("workers.common.OUTPUT_DIR", Path(directory)),
                ):
                    result = await Worker(worker_name)._image("A bright sunrise over Nairobi")

                self.assertTrue(result["ok"], result)
                self.assertEqual(result["model"], model)
                self.assertEqual(mocked_request.await_args.args[0], f"{NVIDIA_IMAGE_BASE_URL}/{model}")
                payload = mocked_request.await_args.args[1]
                self.assertEqual(payload["prompt"], "A bright sunrise over Nairobi")
                self.assertEqual(payload["steps"], steps)
                self.assertEqual(payload["width"], 1024)
                self.assertEqual(payload["height"], 1024)
                self.assertNotIn("model", payload)
                self.assertNotIn("response_format", payload)
                if cfg_scale is None:
                    self.assertNotIn("cfg_scale", payload)
                else:
                    self.assertEqual(payload["cfg_scale"], cfg_scale)

                image_path = Path(directory) / result["image_url"].removeprefix("/output/")
                self.assertEqual(image_path.read_bytes(), image_bytes)

    async def test_explicit_image_endpoint_override_is_preserved(self) -> None:
        mocked_request = AsyncMock(return_value={"artifacts": [{"base64": "aW1hZ2U="}]})
        with (
            patch.dict(os.environ, {"NVIDIA_IMAGE_ENDPOINT": "https://images.example.test/custom"}, clear=False),
            patch("workers.common._http_json", new=mocked_request),
            tempfile.TemporaryDirectory() as directory,
            patch("workers.common.OUTPUT_DIR", Path(directory)),
        ):
            result = await Worker("fast_draft_image_gen")._image("A simple illustration")

        self.assertTrue(result["ok"], result)
        self.assertEqual(mocked_request.await_args.args[0], "https://images.example.test/custom")


if __name__ == "__main__":
    unittest.main()
