from .common import DepartmentRouter
router = DepartmentRouter("reasoning_coding")
async def dispatch(task, context=None, mock=False): return await router.dispatch(task, context, mock)
