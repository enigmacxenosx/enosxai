p = 'enosx-app/src/pages/ChatPage.tsx'
s = open(p).read()

line = '  const { user, isAuthenticated } = useAuth();\n'

# find the declaration line near 187 and remove it
lines = s.split('\n')
removed = False
for i, ln in enumerate(lines):
    if ln.strip() == 'const { user, isAuthenticated } = useAuth();' and not removed:
        del lines[i]
        removed = True
        break
assert removed, 'useAuth line not found'

# insert right after the opening of the component: after "export default function ChatPage() { ... }"
# Place before the first hook (useTheme). Find the line 'const { config } = useTheme();'
out = '\n'.join(lines)
idx = out.find('const { config } = useTheme();')
assert idx != -1
out = out[:idx] + line + out[idx:]

open(p, 'w').write(out)
print('moved useAuth before first hook')
