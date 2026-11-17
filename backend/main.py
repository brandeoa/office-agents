"""Escritório de Agentes: backend FastAPI + WebSocket.

Três agentes em sequência (Pesquisador -> Redator -> Revisor).
Por padrão roda em modo simulado (grátis, sem conta). Configure LLM_PROVIDER
para usar Gemini, Groq ou Ollama.
"""
import asyncio
import os
import random
from pathlib import Path

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

try:  # .env opcional
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

ROOT = Path(__file__).parent.parent
FRONTEND = ROOT / "frontend"

AGENTS = [
    {
        "id": "pesquisador",
        "name": "Pesquisador",
        "color": "#3b82f6",
        "pos": [2, 2],
        "system": "Você é um pesquisador. Liste 5 pontos principais e objetivos sobre o tema, em tópicos curtos, em português.",
    },
    {
        "id": "redator",
        "name": "Redator",
        "color": "#22c55e",
        "pos": [5, 2],
        "system": "Você é um redator de redes sociais. Com base nos pontos recebidos, escreva um post curto e envolvente em português.",
    },
    {
        "id": "revisor",
        "name": "Revisor",
        "color": "#f59e0b",
        "pos": [3, 5],
        "system": "Você é um revisor. Corrija e melhore o texto recebido, mantendo-o curto. Devolva apenas o texto final em português.",
    },
]

app = FastAPI(title="Escritório de Agentes")


# ---------- Provedores de IA ----------
async def ask_llm(system: str, user: str) -> str:
    provider = os.getenv("LLM_PROVIDER", "mock").lower()
    key = os.getenv("API_KEY", "")
    model = os.getenv("MODEL", "")
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            if provider == "gemini":
                model = model or await pick_gemini_model(client, key)
                r = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    headers={"x-goog-api-key": key},
                    json={
                        "system_instruction": {"parts": [{"text": system}]},
                        "contents": [{"parts": [{"text": user}]}],
                    },
                )
                r.raise_for_status()
                return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            if provider == "groq":
                model = model or "llama-3.3-70b-versatile"
                r = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {key}"},
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ],
                    },
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"].strip()
            if provider == "ollama":
                model = model or "llama3.2"
                r = await client.post(
                    "http://localhost:11434/api/chat",
                    json={
                        "model": model,
                        "stream": False,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ],
                    },
                )
                r.raise_for_status()
                return r.json()["message"]["content"].strip()
    except Exception as e:  # cota acabou, sem internet etc.: cai no simulado
        print(f"[aviso] provedor '{provider}' falhou ({e}); usando modo simulado")
    return await mock_llm(system, user)


_gemini_model = None
_EXCLUIR = ("preview", "exp", "live", "image", "tts", "audio", "thinking", "robotics", "computer", "embedding")


async def pick_gemini_model(client: httpx.AsyncClient, key: str) -> str:
    """Pergunta ao Google quais modelos a chave pode usar e escolhe um Flash."""
    global _gemini_model
    if _gemini_model:
        return _gemini_model
    r = await client.get(
        "https://generativelanguage.googleapis.com/v1beta/models",
        headers={"x-goog-api-key": key},
        params={"pageSize": 200},
    )
    r.raise_for_status()
    nomes = []
    for m in r.json().get("models", []):
        n = m["name"].removeprefix("models/")
        if "generateContent" not in m.get("supportedGenerationMethods", []):
            continue
        if "flash" not in n or any(b in n for b in _EXCLUIR):
            continue
        nomes.append(n)
    lite = sorted((n for n in nomes if "lite" in n), reverse=True)
    normais = sorted((n for n in nomes if "lite" not in n), reverse=True)
    escolhas = lite + normais
    if not escolhas:
        raise RuntimeError("nenhum modelo Flash disponível para esta chave")
    _gemini_model = escolhas[0]
    print(f"[info] modelo Gemini escolhido automaticamente: {_gemini_model}")
    return _gemini_model


async def mock_llm(system: str, user: str) -> str:
    await asyncio.sleep(random.uniform(1.5, 3))
    return f"[simulado] Resposta de teste sobre: {user[:120]}"


# ---------- Rotas ----------
@app.get("/api/agents")
async def agents():
    return AGENTS


@app.websocket("/ws")
async def ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            task = (data.get("task") or "").strip()
            if not task:
                continue
            text = task
            for ag in AGENTS:
                await websocket.send_json(
                    {"type": "status", "agent": ag["id"], "state": "working"}
                )
                text = await ask_llm(ag["system"], text)
                await websocket.send_json(
                    {"type": "status", "agent": ag["id"], "state": "done"}
                )
                await websocket.send_json(
                    {"type": "result", "agent": ag["id"], "name": ag["name"], "text": text}
                )
            await websocket.send_json({"type": "done", "final": text})
    except WebSocketDisconnect:
        pass


@app.get("/")
async def index():
    return FileResponse(FRONTEND / "index.html")


app.mount("/static", StaticFiles(directory=FRONTEND), name="static")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
