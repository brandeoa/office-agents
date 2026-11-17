# 🏢 Escritório de Agentes

Projeto de testes: um escritório isométrico onde agentes de IA (Pesquisador → Redator → Revisor) trabalham em equipe. Você envia uma tarefa e vê os personagens mudarem de status em tempo real.

**Stack:** Python + FastAPI + WebSocket · Phaser 3 (isométrico) · IA opcional (Gemini, Groq ou Ollama)

## Como rodar (Mac)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python backend/main.py
```

Abra http://127.0.0.1:8000

Por padrão usa o **modo simulado** (sem conta e sem custo). Para IA real, edite o `.env`:

| Provedor | LLM_PROVIDER | Observação |
|---|---|---|
| Google AI Studio | `gemini` | chave gratuita em aistudio.google.com |
| Groq | `groq` | chave gratuita em console.groq.com |
| Ollama | `ollama` | local, sem conta (`ollama pull llama3.2`) |

Se a cota acabar ou der erro, o sistema volta sozinho ao modo simulado.

## Estrutura

```
backend/main.py     agentes, provedores de IA e WebSocket
frontend/           escritório isométrico (Phaser) e painel de tarefas
```

## Próximos passos

- Sprites melhores e animações de andar
- Mais agentes e salas
- Tarefas em paralelo e histórico em SQLite
