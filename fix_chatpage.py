p = 'enosx-app/src/pages/ChatPage.tsx'
s = open(p).read()

# 1. Fix corrupted combined line
s = s.replace(
    '  const { user, isAuthenticated } = useAuth();arFiles } = useFileContext();\n',
    '  const { user, isAuthenticated } = useAuth();\n'
)

# 2. Add prompts import (after useFileContext import line)
if 'from "@/lib/prompts"' not in s:
    s = s.replace(
        'import { useFileContext } from "@/hooks/useFileContext";',
        'import { useFileContext } from "@/hooks/useFileContext";\nimport { getSystemPrompt } from "@/lib/prompts";'
    )

# 3. Destructure loadFile and removeFile from useFileContext
s = s.replace(
    'const { fileContext, getFileContextMessage, clearFiles } = useFileContext();',
    'const { fileContext, loadFile, removeFile, getFileContextMessage, clearFiles } = useFileContext();'
)

open(p, 'w').write(s)
print('done')
