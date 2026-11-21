from .common import DepartmentRouter
router = DepartmentRouter("physical_ai_science_safety")
async def dispatch(task, context=None, mock=False): return await router.dispatch(task, context, mock)
