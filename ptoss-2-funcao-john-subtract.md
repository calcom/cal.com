# PTOSS-2 — Função do John: `subtract`

Documento de trabalho da função sob responsabilidade do John.

Documentos relacionados: [[ptoss-2-plano-geral]] · [[ptoss-2-test-method-selection]]

- **Arquivo:** `packages/features/schedules/lib/date-ranges.ts` (linhas 423-452)
- **Direção de projeto:** caixa-preta-primeiro → complemento caixa-branca
- **MC/DC:** não (decisões de uma condição)
- **Cobertura real atual:** ~98% (o ramo restante é inalcançável)

## 1. Função

**Propósito.** Remove intervalos excluídos de uma lista de intervalos base,
retornando os pedaços restantes. Usado no cálculo de disponibilidade (subtrair
horários ocupados dos horários disponíveis).

**Código atual (linhas 423-452):**

```ts
export function subtract<TSourceRange extends DateRange, TExcludedRange extends DateRange>(
  sourceRanges: TSourceRange[],
  excludedRanges: TExcludedRange[]
): SubtractedRange<TSourceRange>[] {
  const result: SubtractedRange<TSourceRange>[] = [];
  const sortedExcludedRanges = [...excludedRanges].sort((a, b) => a.start.valueOf() - b.start.valueOf());

  for (const { start: sourceStart, end: sourceEnd, ...passThrough } of sourceRanges) {
    let currentStart = sourceStart;

    for (const excludedRange of sortedExcludedRanges) {
      if (excludedRange.start.valueOf() >= sourceEnd.valueOf()) break;
      if (excludedRange.end.valueOf() <= currentStart.valueOf()) continue;

      if (excludedRange.start.valueOf() > currentStart.valueOf()) {
        result.push({ start: currentStart, end: excludedRange.start, ...passThrough });
      }

      if (excludedRange.end.valueOf() > currentStart.valueOf()) {
        currentStart = excludedRange.end;
      }
    }

    if (sourceEnd.valueOf() > currentStart.valueOf()) {
      result.push({ start: currentStart, end: sourceEnd, ...passThrough });
    }
  }

  return result;
}
```

## 2. Testes Existentes

Há testes dedicados em `packages/features/schedules/lib/date-ranges.test.ts`
(bloco `describe("subtract", ...)`, além de cenários no `intersect`). A função já
está ~98% coberta.

> Situação especial: como já existem testes, o trabalho do John é (a) organizar os
> testes nas tabelas formais de projeto, (b) garantir os casos de equivalência por
> tipo de sobreposição e (c) documentar o achado de guard redundante (seção 8). A
> cobertura não vai subir além de ~98% — o motivo é o achado.

## 3. Projeto dos Casos de Teste (caixa-preta-primeiro)

### 3.1. Particionamento de equivalência por tipo de sobreposição

| # | Classe | Cenário | Saída esperada |
| --- | --- | --- | --- |
| CE1 | Sem sobreposição (excluído antes) | excluído termina antes do source | source inteiro |
| CE2 | Sem sobreposição (excluído depois) | excluído começa depois do source | source inteiro |
| CE3 | Exclusão total | excluído cobre todo o source | `[]` |
| CE4 | Exclusão no meio | excluído dentro do source | dois pedaços |
| CE5 | Exclusão no início | excluído cobre o começo | só o final |
| CE6 | Exclusão no fim | excluído cobre o fim | só o começo |
| CE7 | Múltiplas exclusões | vários excluídos | vários pedaços |

### 3.2. Análise de valor limite

| # | Limite | Cenário | Saída esperada |
| --- | --- | --- | --- |
| VL1 | excluído encosta no início | `excluded.end == source.start` | source inteiro (sem corte) |
| VL2 | excluído encosta no fim | `excluded.start == source.end` | source inteiro (`break`) |

### 3.3. Complemento caixa-branca — decisões

| ID | Decisão (linha) | Efeito | Alcançável? |
| --- | --- | --- | --- |
| D1 | `excludedRange.start >= sourceEnd` (L434) | `break` | Sim |
| D2 | `excludedRange.end <= currentStart` (L435) | `continue` | Sim |
| D3 | `excludedRange.start > currentStart` (L437) | cria pedaço anterior | Sim |
| D4 | `excludedRange.end > currentStart` (L441) | atualiza `currentStart` | ramo `true` Sim; **ramo `false` NÃO** |
| D5 | `sourceEnd > currentStart` (L446) | cria pedaço final | Sim |

## 4. Implementação dos Testes

Os casos já estão majoritariamente cobertos pela suíte existente. O trabalho é
mapear cada teste à classe de sobreposição (rastreabilidade) e completar lacunas
de valor limite (VL1, VL2).

## 5. Resultado da Execução

```bash
TZ=UTC yarn vitest run packages/features/schedules/lib/date-ranges.test.ts
```

## 6. Cobertura

| Momento | Cobertura esperada |
| --- | --- |
| Antes | ~98% (suíte existente) |
| Após | ~98% (estável — o ramo restante é inalcançável) |

```bash
TZ=UTC npx vitest run packages/features/schedules/lib/date-ranges.test.ts \
  --coverage.enabled \
  --coverage.include='packages/features/schedules/lib/date-ranges.ts' \
  --coverage.reporter=text
```

## 7. TDD

O TDD único da equipe é o do Joaquim. Opcionalmente, simplificar o guard
redundante (L441) poderia ser um refactor, mas não é necessário.

## 8. Achado Principal (caixa-branca) — Guard Redundante

O ramo `false` da decisão da linha 441 —
`if (excludedRange.end.valueOf() > currentStart.valueOf())` — é **inalcançável**.

Motivo: a linha 435 (`if (excludedRange.end.valueOf() <= currentStart.valueOf()) continue;`)
já descarta, com `continue`, todo excluído cujo fim seja `<= currentStart`. Entre
a L435 e a L441 o `currentStart` não muda. Logo, ao chegar na L441, é garantido
que `excludedRange.end > currentStart` — a condição é sempre verdadeira, e o ramo
`false` nunca executa.

É uma redundância defensiva. Esse achado de caixa-branca é o ângulo principal
desta função: a **análise estrutural revelou** que o teste do guard já estava
implícito num passo anterior — algo que os testes funcionais (caixa-preta) não
evidenciariam, pois apenas validam o resultado final dos recortes.
