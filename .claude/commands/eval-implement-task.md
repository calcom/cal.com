# Eval: implement-task skill

Leia o arquivo `.claude/commands/implement-task.md` e valide se as instruções cobrem corretamente cada critério abaixo.

Para cada critério, responda com **✅ PASSOU** ou **❌ FALHOU** seguido de uma linha explicando o motivo — citando o trecho relevante da skill quando passar, ou descrevendo o que está faltando quando falhar.

Ao final, exiba um resumo: quantos passaram, quantos falharam, e se a skill está pronta para uso.

---

## Multi-agentes

1. **Três agentes distintos** — A skill define exatamente 3 agentes com papéis separados: pesquisa, implementação e revisão de código?

2. **Agente de pesquisa é read-only** — O agente de pesquisa é instruído explicitamente a não criar nem editar arquivos?

3. **Agente de implementação não commita** — O agente de implementação é instruído a não rodar testes nem fazer commits?

4. **Agente de revisão tem output estruturado** — O agente de revisão é instruído a responder apenas "APROVADO" ou "REPROVADO: <lista>"?

---

## Comentários na task

5. **[PLANEJANDO]** — A skill chama `add_comment` com `[PLANEJANDO]` antes de qualquer trabalho ser iniciado?

6. **[IMPLEMENTANDO]** — A skill chama `add_comment` com `[IMPLEMENTANDO]` antes de cada ciclo do agente de implementação, inclusive nos retries?

7. **[TESTANDO]** — A skill chama `add_comment` com `[TESTANDO]` antes de executar os testes?

8. **[FINALIZADO]** — A skill chama `add_comment` com `[FINALIZADO]` após o code review aprovar?

9. **[PR ABERTO]** — A skill chama `add_comment` com `[PR ABERTO]` incluindo a URL do PR?

10. **[BLOQUEADO]** — A skill chama `add_comment` com `[BLOQUEADO]` quando as tentativas máximas são esgotadas?

---

## Lógica de retry

11. **Limite de 3 tentativas** — O número máximo de tentativas está definido explicitamente como 3?

12. **Retry com contexto ao falhar testes** — Quando os testes falham, a skill volta ao agente de implementação passando o erro como contexto?

13. **Retry com contexto ao reprovar review** — Quando o review retorna REPROVADO, a skill volta ao agente de implementação passando o feedback como contexto?

14. **Caminho de falha definido** — Existe uma etapa de falha (BLOQUEADO) acionada quando o limite de tentativas é atingido, tanto por falha nos testes quanto por reprovação do review?

---

## Branch e PR

15. **Padrão de branch `feat/<ID>`** — A skill instrui criar a branch com o prefixo `feat/` seguido do ID da task?

16. **PR aponta para `main`** — A skill instrui abrir o PR com `main` como branch de destino?

17. **URL do PR no comentário** — A skill captura a URL retornada pelo `gh pr create` e a inclui no comentário `[PR ABERTO]`?

18. **Status atualizado para "In Review"** — A skill chama `update_status` com `In Review` após o PR ser criado?

---

## Gates humanos

19. **Gate 1 — Aprovar plano** — Após a pesquisa e antes de implementar, a skill apresenta o plano ao usuário e aguarda APROVAR ou REJEITAR com feedback?

20. **Gate 1 — Rejeição replana** — Se o usuário rejeitar o plano, a skill registra o motivo via `add_comment` e volta ao agente de pesquisa incorporando o feedback?

21. **Gate 2 — Aprovar código** — Após o code review aprovar e antes de abrir o PR, a skill apresenta o resumo das mudanças ao usuário e aguarda APROVAR ou REJEITAR?

22. **Gate 2 — Rejeição corrige** — Se o usuário rejeitar o código, a skill registra o motivo via `add_comment` e volta ao agente de implementação com o feedback?

---

## Ordem das etapas

23. **Sequência correta** — As etapas seguem a ordem: carregar task → [PLANEJANDO] → pesquisa → **Gate 1** → [IMPLEMENTANDO] → implementação → [TESTANDO] → testes → review → **Gate 2** → [FINALIZADO] → branch + PR → [PR ABERTO]?
