---
name: fifa-calendar
description: Atualiza o calendário de jogos da Copa do Mundo FIFA 2026 buscando dados no site oficial da FIFA e criando uma Pull Request com as mudanças. Use esta skill quando o usuário pedir para atualizar, sincronizar ou buscar jogos da Copa do Mundo 2026, quando mencionar o calendário FIFA, tabela de jogos ou schedule da Copa 2026. Sempre use esta skill se o usuário mencionar "calendário FIFA", "jogos da copa", "atualizar copa", "FIFA 2026" ou quiser criar/atualizar o arquivo fifa/calendario.json.
---

# FIFA Calendar Updater

Esta skill busca a tabela de jogos da Copa do Mundo FIFA 2026 no site oficial da FIFA, atualiza o arquivo `fifa/calendario.json` e abre uma Pull Request com as mudanças.

## Estrutura de arquivos

```
.claude/skills/fifa-calendar/
├── SKILL.md                      ← este arquivo
├── scripts/
│   ├── fetch_fifa_data.py        ← busca dados no site da FIFA e atualiza o JSON
│   └── create_pr.sh              ← cria branch, commit e abre PR draft
└── templates/
    └── pr_body.md                ← corpo da Pull Request
```

## Passos da execução

### 1. Buscar e atualizar o JSON

Execute o script de fetch a partir da raiz do repositório:

```bash
python .claude/skills/fifa-calendar/scripts/fetch_fifa_data.py --output fifa/calendario.json
```

O script:
- Tenta buscar os jogos nas URLs oficiais da FIFA (HTML e API REST)
- Lê o `fifa/calendario.json` existente (ou começa do zero se não existir)
- Mescla os novos dados: adiciona jogos novos e atualiza jogos que mudaram
- **Nunca remove** jogos já existentes no JSON
- Salva o resultado atualizado e imprime uma linha `SUMMARY:total=N,added=N,updated=N`

Se o script falhar em todas as fontes, ele encerra com código de saída 1 e imprime um erro. Nesse caso, informe o usuário e sugira verificar manualmente em https://www.fifa.com.

### 2. Criar a Pull Request

Capture o sumário impresso pelo script e passe para o script de PR:

```bash
SUMMARY=$(python .claude/skills/fifa-calendar/scripts/fetch_fifa_data.py --output fifa/calendario.json \
  | grep "^SUMMARY:" | sed 's/^SUMMARY://')

bash .claude/skills/fifa-calendar/scripts/create_pr.sh "$SUMMARY"
```

O script de PR:
- Cria (ou reutiliza) a branch `chore/update-fifa-calendar-YYYY-MM-DD`
- Faz commit de `fifa/calendario.json`
- Faz push e abre um PR **draft** usando o template em `templates/pr_body.md`
- Imprime o link da PR criada

### 3. Informar o usuário

Ao final, reporte:
- Total de jogos no JSON
- Quantos foram adicionados
- Quantos foram atualizados
- O link da Pull Request

## Formato do JSON

```json
{
  "updated_at": "2026-05-19T15:30:00Z",
  "tournament": "FIFA World Cup 2026",
  "games": [
    {
      "id": "WC2026-001",
      "date": "2026-06-11",
      "time": "20:00",
      "timezone": "UTC",
      "team1": "México",
      "team2": "TBD",
      "venue": "Estadio Azteca",
      "city": "Cidade do México",
      "phase": "Fase de Grupos",
      "group": "A",
      "score": {
        "team1": null,
        "team2": null
      }
    }
  ]
}
```

Fases válidas: `"Fase de Grupos"`, `"Oitavas de Final"`, `"Quartas de Final"`, `"Semifinal"`, `"Terceiro Lugar"`, `"Final"`.

## Tratamento de erros

| Situação | Ação |
|---|---|
| `fetch_fifa_data.py` não encontra jogos | Informa o usuário; sugere verificar https://www.fifa.com |
| `gh` não disponível | Salva o JSON localmente; orienta o usuário a criar a PR manualmente |
| Branch já existe | `create_pr.sh` reutiliza a branch existente |
| Nenhuma mudança no JSON | `create_pr.sh` encerra sem commit |
