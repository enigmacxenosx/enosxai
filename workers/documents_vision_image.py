from .common import DepartmentRouter
router = DepartmentRouter("documents_vision_image")
async def dispatch(task, context=None, mock=False): return await router.dispatch(task, context, mock)
