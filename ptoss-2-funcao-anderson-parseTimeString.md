# PTOSS-2 — Função do Anderson: `parseTimeString`

Documento de trabalho da função sob responsabilidade do Anderson.

Documentos relacionados: [[ptoss-2-plano-geral]] · [[ptoss-2-test-method-selection]]

- **Arquivo:** `packages/features/schedules/components/ScheduleComponent.tsx` (linhas 405-421)
- **Direção de projeto:** caixa-preta-primeiro → complemento caixa-branca
- **MC/DC:** a decisão da L416 tem 4 condições, mas é **código morto** (ver seção 8)
- **Cobertura real atual:** ~95% (o resto é inalcançável)

## 1. Função

**Propósito.** Converte uma string de horário em um `Date` (em UTC), respeitando
o formato 12h ou 24h, ou retorna `null` para entradas inválidas.

**Onde é usada:** dentro do próprio `ScheduleComponent.tsx`, no campo de digitação
de horário (`handleInputChange` e na seleção de horário).

**Código atual (linhas 405-421):**

```ts
export function parseTimeString(input: string, timeFormat: number | null): Date | null {
  if (!input.trim()) return null;

  const formats = timeFormat === 12 ? ["h:mma", "HH:mm"] : ["HH:mm", "h:mma"];
  const parsed = dayjs(input, formats, true); // strict parsing

  if (!parsed.isValid()) return null;

  const hours = parsed.hour();
  const minutes = parsed.minute();

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return new Date(new Date().setUTCHours(hours, minutes, 0, 0));
}
```

## 2. Testes Existentes

Há suíte dedicada e extensa:
`packages/features/schedules/components/parse-time-string.test.ts` (236 linhas,
33 testes). Cobre formatos 24h, 12h, valores limite, casos inválidos e
arredondamento. A função já está ~95% coberta por ela.

> Situação especial: como já existem muitos testes, o trabalho do Anderson é
> principalmente (a) organizar esses testes nas tabelas formais de projeto, (b)
> garantir a perspectiva complementar e (c) documentar o achado de código morto
> abaixo. A cobertura não vai subir além de ~95% — e o motivo é justamente o
> achado.

## 3. Projeto dos Casos de Teste (caixa-preta-primeiro)

### 3.1. Particionamento de equivalência

| # | Classe | Entrada | Saída esperada |
| --- | --- | --- | --- |
| CE1 | Vazio/espaços | `""`, `"   "` | `null` |
| CE2 | 24h válido | `"09:30"`, formato 24 | `Date` |
| CE3 | 12h válido | `"4:05pm"`, formato 12 | `Date` |
| CE4 | Formato inválido | `"invalid"`, `"99"` | `null` |
| CE5 | 12h especiais | `"12:00am"` → 00:00; `"12:00pm"` → 12:00 | `Date` |

### 3.2. Análise de valor limite

| # | Limite | Entrada | Saída esperada |
| --- | --- | --- | --- |
| VL1 | mínimo válido | `"00:00"` | `Date` 00:00 |
| VL2 | máximo válido | `"23:59"` | `Date` 23:59 |
| VL3 | hora acima do limite | `"24:00"` | `null` (rejeitado no parse estrito) |
| VL4 | minuto acima do limite | `"16:60"` | `null` (rejeitado no parse estrito) |

### 3.3. Complemento caixa-branca — decisões

| ID | Decisão (linha) | Tipo | Alcançável? |
| --- | --- | --- | --- |
| D1 | `!input.trim()` (L406) | 1 condição | Sim |
| D2 | `timeFormat === 12` (L408) | 1 condição (ternário) | Sim |
| D3 | `!parsed.isValid()` (L411) | 1 condição | Sim |
| D4 | `hours < 0 \|\| hours > 23 \|\| minutes < 0 \|\| minutes > 59` (L416) | 4 condições | **NÃO** (código morto) |

## 4. Implementação dos Testes

Os casos acima já estão majoritariamente implementados na suíte existente. O
trabalho é mapear cada teste à classe/valor limite correspondente
(rastreabilidade) e adicionar qualquer caso de borda que falte.

## 5. Resultado da Execução

```bash
TZ=UTC yarn vitest run packages/features/schedules/components/parse-time-string.test.ts
```

## 6. Cobertura

| Momento | Cobertura esperada |
| --- | --- |
| Antes | ~95% (suíte existente) |
| Após | ~95% (estável — o resto é inalcançável) |

```bash
TZ=UTC npx vitest run packages/features/schedules/components/parse-time-string.test.ts \
  --coverage.enabled \
  --coverage.include='packages/features/schedules/components/ScheduleComponent.tsx' \
  --coverage.reporter=text
```

## 7. TDD

O TDD único da equipe é o do Joaquim. Opcionalmente, remover a guarda de código
morto (L416-417) poderia ser um refactor, mas não é necessário.

## 8. Achado Principal (caixa-branca) — Código Inalcançável

A decisão da linha 416 — `if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null` —
é **código morto**. O parsing estrito do dayjs nas linhas 409-411 já rejeita
qualquer hora/minuto fora do intervalo (ex.: "24:00" não casa com `HH:mm`,
"16:60" não casa com `mm` 00-59), retornando `null` antes de chegar à L416.

Consequência: nenhum teste consegue tornar a condição da L416 verdadeira; a linha
417 (`return null`) é inalcançável. Isso é uma evidência clássica de
complementaridade: a **análise estrutural (caixa-branca) revelou** uma guarda
defensiva redundante que os testes funcionais (caixa-preta) jamais exercitariam.

> Detalhe para o relatório: a L416 é uma decisão de 4 condições. Pode-se até
> montar a tabela-verdade MC/DC teórica dela, mas então demonstrar que **nenhuma**
> das linhas com resultado `true` é alcançável na prática — um exemplo forte de
> limite das técnicas.
