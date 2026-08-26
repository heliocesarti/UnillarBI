"""Configuração de período/situação usada pelas consultas pesadas.

Objetivo: nenhuma consulta deve ter janela de data ou filtro de status
fixo no código-fonte — tudo fica aqui, editável pela tela Configurações,
sem precisar mexer em Python. Muda o valor, clica em "Atualizar dados" de
novo, pronto.

`vendas_periodo` é um dict com um `modo` (usado só pra limitar a janela
de vendas puxada do banco — entradas/pedidos pendentes não têm corte de
data, sempre traz tudo que ainda está pendente):
  - "dias": últimos N dias até hoje (N em `dias`)
  - "mes_atual": do dia 1 do mês corrente até hoje
  - "ano_atual": de 1º de janeiro do ano corrente até hoje
  - "livre": de `data_inicio` até `data_fim` (data_fim vazio = hoje)
"""

import json
import threading
from datetime import date, datetime, timedelta
from pathlib import Path

_lock = threading.Lock()

_CONFIG_FILE = Path(__file__).resolve().parent.parent / ".query_config.json"

MODOS_VALIDOS = {"dias", "mes_atual", "ano_atual", "livre"}

DEFAULT_CONFIG = {
    "ruptura": {
        # Teto fixo de 1 ano — cobre a maior opção do filtro de dias do
        # topbar (12m = 365 dias) sem puxar mais histórico de vendas do
        # que o necessário (consulta pesada, não vale sobrecarregar).
        "vendas_periodo": {"modo": "dias", "dias": 365, "data_inicio": None, "data_fim": None},
        "situacao_entrada": "PENDENTE",
        "operacao_entrada": "Entrada por COMPRA",
        "permitecompra": "A",
        "permitevenda": "A",
        # Terceira trava de elegibilidade (z_dw_011) além de permitecompra/permitevenda.
        "pro_status": "A",
    }
}


def _merge_defaults(saved, defaults):
    """Preenche com o default qualquer chave que falte no que foi salvo
    (permite adicionar campo novo depois sem quebrar config antiga)."""
    if not isinstance(saved, dict):
        return defaults
    merged = dict(defaults)
    for key, default_value in defaults.items():
        if key in saved:
            if isinstance(default_value, dict):
                merged[key] = _merge_defaults(saved[key], default_value)
            else:
                merged[key] = saved[key]
    return merged


def _load_from_disk():
    if not _CONFIG_FILE.exists():
        return dict(DEFAULT_CONFIG)
    try:
        with open(_CONFIG_FILE, encoding="utf-8") as f:
            saved = json.load(f)
        return {
            tela: _merge_defaults(saved.get(tela), defaults)
            for tela, defaults in DEFAULT_CONFIG.items()
        }
    except Exception:
        return dict(DEFAULT_CONFIG)  # arquivo corrompido — volta pro padrão


_config = _load_from_disk()


def _save_to_disk():
    try:
        with open(_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(_config, f, ensure_ascii=False, indent=2)
    except Exception:
        pass  # não é crítico — só não persiste, continua valendo em memória


def get_config(tela="ruptura"):
    with _lock:
        return json.loads(json.dumps(_config[tela]))  # cópia profunda


def get_all_config():
    with _lock:
        return json.loads(json.dumps(_config))


def save_config(tela, novo_valor):
    with _lock:
        _config[tela] = novo_valor
        _save_to_disk()


def reset_config(tela):
    with _lock:
        _config[tela] = json.loads(json.dumps(DEFAULT_CONFIG[tela]))
        _save_to_disk()
        return _config[tela]


def _parse_iso_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


def resolve_periodo(periodo_cfg):
    """Retorna (data_inicio, data_fim) como objetos date, prontos pra ir
    direto num parâmetro de query SQL."""
    hoje = date.today()
    modo = periodo_cfg.get("modo", "dias")

    if modo == "dias":
        dias = int(periodo_cfg.get("dias") or 1)
        return hoje - timedelta(days=dias), hoje

    if modo == "mes_atual":
        return hoje.replace(day=1), hoje

    if modo == "ano_atual":
        return hoje.replace(month=1, day=1), hoje

    if modo == "livre":
        data_inicio = _parse_iso_date(periodo_cfg["data_inicio"])
        data_fim_raw = periodo_cfg.get("data_fim")
        data_fim = _parse_iso_date(data_fim_raw) if data_fim_raw else hoje
        return data_inicio, data_fim

    raise ValueError(f"modo de período inválido: {modo!r}")


def validate_periodo(periodo_cfg):
    modo = periodo_cfg.get("modo")
    if modo not in MODOS_VALIDOS:
        raise ValueError(f"modo deve ser um de {sorted(MODOS_VALIDOS)}, recebido {modo!r}")
    if modo == "dias":
        dias = periodo_cfg.get("dias")
        if not isinstance(dias, int) or dias <= 0:
            raise ValueError("dias deve ser um inteiro positivo quando modo='dias'")
    if modo == "livre":
        if not periodo_cfg.get("data_inicio"):
            raise ValueError("data_inicio é obrigatório quando modo='livre'")
        _parse_iso_date(periodo_cfg["data_inicio"])  # levanta erro se inválida
        if periodo_cfg.get("data_fim"):
            _parse_iso_date(periodo_cfg["data_fim"])


def validate_ruptura_config(cfg):
    validate_periodo(cfg["vendas_periodo"])
    if not cfg.get("situacao_entrada"):
        raise ValueError("situacao_entrada não pode ser vazio")
    if not cfg.get("operacao_entrada"):
        raise ValueError("operacao_entrada não pode ser vazio")
    if cfg.get("permitecompra") not in ("A", "I"):
        raise ValueError("permitecompra deve ser 'A' ou 'I'")
    if cfg.get("permitevenda") not in ("A", "I"):
        raise ValueError("permitevenda deve ser 'A' ou 'I'")
    if cfg.get("pro_status") not in ("A", "I"):
        raise ValueError("pro_status deve ser 'A' ou 'I'")
