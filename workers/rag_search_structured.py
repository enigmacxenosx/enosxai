from .common import DepartmentRouter
router = DepartmentRouter("rag_search_structured")
async def dispatch(task, context=None, mock=False): return await router.dispatch(task, context, mock)
