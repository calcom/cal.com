# PTOSS-2 — Função do Rodrigo: `extractHostTimezone`

Documento de trabalho da função sob responsabilidade do Rodrigo.

Documentos relacionados: [[ptoss-2-plano-geral]] · [[ptoss-2-test-method-selection]]

- **Arquivo:** `packages/lib/hashedLinksUtils.ts`
- **Direção de projeto:** caixa-branca-primeiro → complemento caixa-preta
- **MC/DC:** sim (decisões de 2 e 3 condições)
- **Cobertura real atual:** 0% (sem teste dedicado)

## 1. Função

**Propósito.** Extrai o fuso horário do "host" a partir dos dados de um tipo de
evento. A ordem de precedência é: evento pessoal (owner) → time com hosts → time
com membros → fallback para o fuso adivinhado pelo ambiente.

**Onde é usada:** `apps/web/modules/event-types/components/tabs/advanced/EventAdvancedTab.tsx`
e `apps/web/modules/event-types/views/event-types-listing-view.tsx` (também a
função irmã `isTimeBasedExpired` a consome).

**Código atual (`packages/lib/hashedLinksUtils.ts`, linhas 37-54):**

```ts
export function extractHostTimezone(eventType: EventTypeForTimezone): string {
  if (eventType?.userId && eventType?.owner?.timeZone) {
    return eventType.owner.timeZone;
  } else if (eventType?.teamId) {
    if (eventType.hosts && eventType.hosts.length > 0 && eventType.hosts[0]?.user?.timeZone) {
      return eventType.hosts[0].user.timeZone;
    } else if (
      eventType.team?.members &&
      eventType.team.members.length > 0 &&
      eventType.team.members[0]?.user?.timeZone
    ) {
      return eventType.team.members[0]?.user?.timeZone;
    }
  }
  return dayjs.tz.guess();
}
```

## 2. Testes Existentes

Não há teste dedicado para esta função. Cobertura real = 0%.

## 3. Projeto dos Casos de Teste (caixa-branca-primeiro)

### 3.1. Tabela de decisões e condições

| ID | Decisão (linha) | Condições | Saída no `true` |
| --- | --- | --- | --- |
| D1 | `userId && owner?.timeZone` (L38) | A=`userId`, B=`owner?.timeZone` | retorna fuso do owner |
| D2 | `teamId` (L41) | `teamId` | entra no bloco de time |
| D3 | `hosts && hosts.length > 0 && hosts[0]?.user?.timeZone` (L43) | C=`hosts`, D=`hosts.length>0`, E=`hosts[0]?.user?.timeZone` | retorna fuso do host |
| D4 | `members && members.length > 0 && members[0]?.user?.timeZone` (L45-49) | F=`members`, G=`members.length>0`, H=`members[0]?.user?.timeZone` | retorna fuso do membro |

### 3.2. Tabela-verdade MC/DC — Decisão D1 (`A && B`)

| Caso | A (userId) | B (owner.tz) | Resultado |
| --- | --- | --- | --- |
| M1 | F | T | **F** |
| M2 | T | F | **F** |
| M3 | T | T | **T** |

Pares de independência: **A** = (M1, M3); **B** = (M2, M3). Conjunto mínimo:
{M1, M2, M3}.

### 3.3. Tabela-verdade MC/DC — Decisão D3 (`C && D && E`)

| Caso | C (hosts) | D (length>0) | E (host.tz) | Resultado |
| --- | --- | --- | --- | --- |
| N1 | F | T | T | **F** |
| N2 | T | F | T | **F** |
| N3 | T | T | F | **F** |
| N4 | T | T | T | **T** |

Pares de independência: **C** = (N1, N4); **D** = (N2, N4); **E** = (N3, N4).
Conjunto mínimo: {N1, N2, N3, N4}.

> Como construir cada condição: C=F → `hosts` ausente/null; C=T,D=F → `hosts: []`
> (array vazio é truthy mas length 0); C=T,D=T,E=F → `hosts: [{ user: { timeZone: null } }]`;
> C=T,D=T,E=T → `hosts: [{ user: { timeZone: "America/Sao_Paulo" } }]`.

A decisão D4 (`F && G && H`) tem estrutura idêntica a D3 — repetir a mesma tabela
trocando hosts por `team.members`.

### 3.4. Complemento caixa-preta — particionamento de equivalência

| # | Classe (tipo de evento) | Entrada | Saída esperada |
| --- | --- | --- | --- |
| CE1 | Pessoal com owner | `userId` + `owner.timeZone` | fuso do owner |
| CE2 | Time com host válido | `teamId` + `hosts[0].user.timeZone` | fuso do host |
| CE3 | Time sem host, com membro | `teamId` + `team.members[0].user.timeZone` | fuso do membro |
| CE4 | Sem dados de fuso | objeto vazio ou sem fusos | fallback (`dayjs.tz.guess()`) |

## 4. Implementação dos Testes

Arquivo a criar: `packages/lib/hashedLinksUtils.test.ts`.

- 3 casos MC/DC de D1 + 4 casos MC/DC de D3 (e replicar para D4).
- 4 casos de equivalência por tipo de evento (CE1-CE4).
- Para o fallback (CE4): basta verificar que o retorno é uma string não vazia,
  já que `dayjs.tz.guess()` depende do ambiente.

## 5. Resultado da Execução

```bash
TZ=UTC yarn vitest run packages/lib/hashedLinksUtils.test.ts
```

## 6. Cobertura

| Momento | Cobertura esperada |
| --- | --- |
| Antes | 0% (sem teste dedicado) |
| Após | ~100% da função `extractHostTimezone` |

```bash
TZ=UTC npx vitest run packages/lib/hashedLinksUtils.test.ts \
  --coverage.enabled \
  --coverage.include='packages/lib/hashedLinksUtils.ts' \
  --coverage.reporter=text
```

## 7. TDD

O TDD único da equipe é o do Joaquim (`isPasswordValid`). Esta função não precisa
de ciclo de TDD próprio.

## 8. Insumos para a Análise Crítica

- A precedência owner → host → membro → fallback é uma regra de domínio que só
  fica explícita ao cruzar a especificação (caixa-preta) com a estrutura
  aninhada (caixa-branca).
- As decisões de 3 condições mostram bem por que o MC/DC é mais forte que a
  simples cobertura de branches: é preciso variar cada condição isoladamente.
