# Implement Task: $ARGUMENTS

Você é o **orquestrador** de um pipeline de desenvolvimento multi-agente. Sua missão é carregar a task `$ARGUMENTS` do Jira MCP, implementá-la com qualidade e abrir um PR. Siga cada etapa na ordem e sem pular nenhuma.

**Variável global a manter durante toda a execução:**
- `TASK_ID` = "$ARGUMENTS"
- `TASK_TITLE` = (preencher na Etapa 1)
- `TENTATIVAS` = 0 (contador de ciclos implementar → testar → revisar)
- `MAX_TENTATIVAS` = 3

---

## ETAPA 1 — Carregar a task (PLANEJANDO)

1. Chame a ferramenta `get_task` do servidor MCP `jira-mcp` com `task_id = "$ARGUMENTS"`. Guarde o título e a descrição completa retornados.

2. Chame a ferramenta `add_comment` do servidor MCP `jira-mcp`:
   - `task_id`: "$ARGUMENTS"
   - `author`: "Claude Code"
   - `text`: "[PLANEJANDO] Iniciando análise e planejamento da task."

---

## ETAPA 2 — Agente de Pesquisa

Spawne um **agente de pesquisa** (somente leitura — não deve criar ou editar arquivos) com o seguinte prompt, substituindo os placeholders:

```
Você é um agente de pesquisa. Não edite nenhum arquivo.

Task: $ARGUMENTS
Título: <TASK_TITLE>
Descrição: <descrição completa da task>

Missão — retorne um plano estruturado com:

1. Leia o CLAUDE.md do projeto para entender as convenções.
2. Explore a estrutura de pastas (src/, app/, packages/, apps/, tests/, etc.) e entenda a arquitetura.
3. Identifique quais arquivos devem ser criados ou modificados, com o caminho completo de cada um.
4. Determine o comando exato para rodar os testes (ex: npm test, npx vitest, pytest, make test). Para isso leia package.json ou pyproject.toml se existirem.
5. Se a task mencionar APIs, libs externas ou padrões não triviais, busque na web a documentação necessária.
6. Retorne um "Plano de Implementação" com:
   - Lista de arquivos a criar/modificar
   - Abordagem técnica detalhada
   - Comando de teste
   - Contexto adicional relevante
```

Salve o resultado completo do agente como `PLANO_PESQUISA`.

---

## 🚦 GATE HUMANO 1 — Aprovar plano de implementação

Apresente ao usuário o plano de pesquisa de forma clara:

```
📋 Plano de implementação para $ARGUMENTS

Arquivos a criar/modificar:
<lista de arquivos>

Abordagem técnica:
<resumo da abordagem>

Comando de testes: <comando>

Digite APROVAR para continuar ou REJEITAR com feedback para replanejar.
```

**Aguarde a resposta do usuário antes de prosseguir.**

- Se o usuário digitar **APROVAR** (ou variação como "ok", "pode ir", "aprovado"): continue para a Etapa 3.
- Se o usuário digitar **REJEITAR** seguido de feedback: chame `add_comment` com `[PLANEJANDO] Plano rejeitado pelo usuário. Motivo: <feedback>` e volte à **ETAPA 2** incorporando o feedback no prompt do agente de pesquisa. Repita até aprovação.

---

## ETAPA 3 — Ciclo: Implementar → Testar → Revisar

> Este ciclo pode repetir até `MAX_TENTATIVAS` (3) vezes. Incremente `TENTATIVAS` a cada repetição.

### 3.1 — Agente de Implementação (IMPLEMENTANDO)

Chame `add_comment` do MCP `jira-mcp`:
- `task_id`: "$ARGUMENTS"
- `author`: "Claude Code"
- `text`: "[IMPLEMENTANDO] Iniciando implementação (tentativa $TENTATIVAS)."

Spawne um **agente de implementação** com o seguinte prompt:

```
Você é um agente de implementação. Implemente as mudanças necessárias para a task abaixo.

Task: $ARGUMENTS
Título: <TASK_TITLE>
Descrição: <descrição completa>

Plano de pesquisa:
<PLANO_PESQUISA>

<Se for uma iteração com erros, inclua:>
Erros da tentativa anterior:
<OUTPUT_ERRO ou FEEDBACK_REVISOR>

Regras:
- Implemente APENAS o que está na task. Sem extras.
- Siga as convenções do CLAUDE.md e o estilo do código existente.
- Não rode testes, não faça commits, apenas escreva/edite arquivos.
- Ao terminar, liste todos os arquivos criados ou modificados.
```

Aguarde o resultado antes de continuar.

### 3.2 — Testes (TESTANDO)

Chame `add_comment` do MCP `jira-mcp`:
- `task_id`: "$ARGUMENTS"
- `author`: "Claude Code"
- `text`: "[TESTANDO] Executando testes e verificando compilação."

Execute o comando de teste identificado pelo agente de pesquisa. Se não identificado, tente nesta ordem:
1. Se existir `package.json`: rode `npm test` ou `npm run build`
2. Se existir `tsconfig.json`: rode `npx tsc --noEmit`
3. Se existir `pyproject.toml` ou `pytest.ini`: rode `pytest`
4. Fallback: `python -m py_compile` nos arquivos modificados

**Se os testes FALHAREM ou o código NÃO COMPILAR:**
- Salve o output de erro como `OUTPUT_ERRO`.
- Se `TENTATIVAS < MAX_TENTATIVAS`: chame `add_comment`:
  - `text`: "[IMPLEMENTANDO] Testes falharam na tentativa $TENTATIVAS. Iniciando correção. Erro: <primeiras 5 linhas do erro>"
  - Volte para **3.1** com `OUTPUT_ERRO` como contexto adicional.
- Se `TENTATIVAS >= MAX_TENTATIVAS`: vá para **ETAPA DE FALHA** no final deste documento.

**Se os testes PASSAREM:** continue para 3.3.

### 3.3 — Agente de Revisão de Código

Spawne um **agente de revisão** com o seguinte prompt:

```
Você é um revisor de código sênior. Avalie se a implementação resolve a task com qualidade.

Task: $ARGUMENTS
Título: <TASK_TITLE>
Descrição: <descrição>

Verifique nos arquivos modificados:
1. A implementação resolve completamente o solicitado?
2. Há bugs óbvios ou casos de borda ignorados?
3. Há vulnerabilidades de segurança (XSS, SQL injection, dados expostos)?
4. O código segue as convenções do projeto?

Responda EXATAMENTE com uma das opções abaixo (sem texto extra antes):
- "APROVADO" — nenhum problema crítico encontrado
- "REPROVADO: <lista numerada dos problemas críticos a corrigir>"
```

**Se o revisor retornar REPROVADO:**
- Salve o feedback como `FEEDBACK_REVISOR`.
- Se `TENTATIVAS < MAX_TENTATIVAS`: chame `add_comment`:
  - `text`: "[IMPLEMENTANDO] Code review reprovou na tentativa $TENTATIVAS. Corrigindo: <lista de problemas>"
  - Volte para **3.1** com `FEEDBACK_REVISOR` como contexto.
- Se `TENTATIVAS >= MAX_TENTATIVAS`: vá para **ETAPA DE FALHA**.

**Se o revisor retornar APROVADO:** continue para o Gate 2.

---

## 🚦 GATE HUMANO 2 — Aprovar código antes do PR

Apresente ao usuário um resumo do que foi implementado:

```
✅ Implementação aprovada pelo code review ($TENTATIVAS tentativa(s))

Arquivos modificados:
<lista de arquivos criados/editados pelo agente de implementação>

Resumo do que foi feito:
<descrição objetiva das mudanças>

Resultado dos testes: ✅ passando

Digite APROVAR para abrir o PR ou REJEITAR com feedback para corrigir.
```

**Aguarde a resposta do usuário antes de prosseguir.**

- Se o usuário digitar **APROVAR** (ou variação): continue para a Etapa 4.
- Se o usuário digitar **REJEITAR** seguido de feedback: chame `add_comment` com `[IMPLEMENTANDO] Código rejeitado pelo usuário. Motivo: <feedback>` e volte à **ETAPA 3** com o feedback como contexto adicional para o agente de implementação (conta no limite de tentativas).

---

## ETAPA 4 — Finalizar (FINALIZADO)

Chame `add_comment` do MCP `jira-mcp`:
- `task_id`: "$ARGUMENTS"
- `author`: "Claude Code"
- `text`: "[FINALIZADO] Implementação aprovada. Testes passando e code review aprovado após $TENTATIVAS tentativa(s)."

---

## ETAPA 5 — Branch, Commit e PR (PR ABERTO)

Execute os comandos abaixo em sequência. Confirme que cada um tem sucesso antes de prosseguir.

```bash
git checkout -b feat/$ARGUMENTS
git add -A
git commit -m "feat($ARGUMENTS): <TASK_TITLE>"
git push origin feat/$ARGUMENTS
```

Depois abra o PR com `gh pr create`. Use um HEREDOC para o body:

```bash
gh pr create \
  --base main \
  --title "[$ARGUMENTS] <TASK_TITLE>" \
  --body "$(cat <<'EOF'
## Task

**ID:** $ARGUMENTS
**Título:** <TASK_TITLE>

## O que foi implementado

<resumo do que o agente de implementação fez>

## Abordagem

<abordagem técnica do plano de pesquisa>

## Code Review

Aprovado após $TENTATIVAS tentativa(s).

---
🤖 Implementado automaticamente via skill implement-task
EOF
)"
```

Capture a URL do PR exibida na saída do comando.

Chame `add_comment` do MCP `jira-mcp`:
- `task_id`: "$ARGUMENTS"
- `author`: "Claude Code"
- `text`: "[PR ABERTO] Pull Request criado com sucesso: <URL_DO_PR>"

Chame `update_status` do MCP `jira-mcp`:
- `task_id`: "$ARGUMENTS"
- `new_status`: "In Review"

Informe ao usuário: "Task $ARGUMENTS implementada com sucesso! PR: <URL_DO_PR>"

---

## ETAPA DE FALHA (se atingir MAX_TENTATIVAS)

Chame `add_comment` do MCP `jira-mcp`:
- `task_id`: "$ARGUMENTS"
- `author`: "Claude Code"
- `text`: "[BLOQUEADO] Não foi possível concluir após $MAX_TENTATIVAS tentativas. Intervenção manual necessária. Último erro/feedback: <OUTPUT_ERRO ou FEEDBACK_REVISOR>"

Informe ao usuário o que foi tentado, qual erro persiste e os arquivos que foram modificados até o momento.
