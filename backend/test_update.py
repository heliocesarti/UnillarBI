import sys
import os

# Add the backend dir to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ruptura_query import compute_base

print("Iniciando teste local de compute_base...")
try:
    result = compute_base()
    print("Sucesso! Ativos carregados:", len(result["ativos"]))
except Exception as e:
    print("Erro durante a execução:", str(e))
