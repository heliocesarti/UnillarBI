import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ruptura_query import compute_dynamic

print("Carregando base do cache...")
with open('.ruptura_cache.json', 'r', encoding='utf-8') as f:
    state = json.load(f)

base = state["data"]
print("Computando dynamic...")
try:
    result = compute_dynamic(base, dias=120, filial="todas")
    print(f"Total na tabela: {len(result['produtos'])}")
    if len(result['produtos']) > 0:
        print("Exemplo 1:", result['produtos'][0])
except Exception as e:
    import traceback
    traceback.print_exc()
