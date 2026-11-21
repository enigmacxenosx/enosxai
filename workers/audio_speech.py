from .common import DepartmentRouter
router = DepartmentRouter("audio_speech")
async def dispatch(task, context=None, mock=False): return await router.dispatch(task, context, mock)
