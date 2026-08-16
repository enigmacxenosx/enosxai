import json
import re

raw = re.sub(rb'\x1b\[[0-9;]*m', b'', open('/tmp/runs.json', 'rb').read())
d = json.loads(raw)
for w in d.get('workflow_runs', [])[:4]:
    print(w['id'], w['name'], w['status'], w.get('conclusion'), w['head_sha'][:7], w['created_at'])
