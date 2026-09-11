import email.message
import logging
import os
import smtplib
import urllib.parse
import urllib.request

logger = logging.getLogger("unillarbi.notifier")

# "telegram" | "email" | "none" (default) — configurado no .env.
ALERT_CHANNEL = os.environ.get("ALERT_CHANNEL", "none").strip().lower()


def notify_error(titulo: str, detalhe: str) -> None:
    """Envia um alerta externo quando algo falha de verdade. Uma falha AQUI
    (canal fora do ar, credencial errada) nunca pode derrubar o fluxo
    principal — só loga e segue."""
    try:
        if ALERT_CHANNEL == "telegram":
            _notify_telegram(titulo, detalhe)
        elif ALERT_CHANNEL == "email":
            _notify_email(titulo, detalhe)
        else:
            logger.warning("Alerta nao enviado (ALERT_CHANNEL nao configurado no .env): %s", titulo)
    except Exception:
        logger.exception("Falha ao ENVIAR o alerta (o erro original ja foi logado acima)")


def _notify_telegram(titulo: str, detalhe: str) -> None:
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    chat_id = os.environ["TELEGRAM_CHAT_ID"]
    texto = f"Unillar BI - {titulo}\n\n{detalhe[:3500]}"
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    body = urllib.parse.urlencode({"chat_id": chat_id, "text": texto}).encode()
    with urllib.request.urlopen(url, data=body, timeout=10) as resp:
        resp.read()


def _notify_email(titulo: str, detalhe: str) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", 587))
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASSWORD"]
    destinatario = os.environ["ALERT_EMAIL_TO"]

    msg = email.message.EmailMessage()
    msg["Subject"] = f"Unillar BI - {titulo}"
    msg["From"] = user
    msg["To"] = destinatario
    msg.set_content(detalhe)

    with smtplib.SMTP(host, port, timeout=10) as smtp:
        smtp.starttls()
        smtp.login(user, password)
        smtp.send_message(msg)
