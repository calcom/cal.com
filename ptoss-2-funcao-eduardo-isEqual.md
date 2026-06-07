# PTOSS-2 — Função do Eduardo: `isEqual`

Documento de trabalho da função sob responsabilidade do Eduardo.

Documentos relacionados: [[ptoss-2-plano-geral]] · [[ptoss-2-test-method-selection]]

- **Arquivo:** `packages/lib/isEqual.ts`
- **Direção de projeto:** caixa-preta-primeiro → complemento caixa-branca
- **MC/DC:** parcial (decisões de 2 condições no complemento)
- **Cobertura real atual:** 0% (sem teste dedicado)

## 1. Função

**Propósito.** Compara dois valores por igualdade profunda (deep equality),
recursivamente, tratando primitivos, `null`/`undefined`, arrays e objetos.

**Código atual (`packages/lib/isEqual.ts`):**

```ts
export function isEqual(value: unknown, other: unknown): boolean {
  if (value === other) return true;
  if (value == null || other == null) return false;

  if (Array.isArray(value) && Array.isArray(other)) {
    if (value.length !== other.length) return false;
    return value.every((val, i) => isEqual(val, other[i]));
  }

  if (typeof value === "object" && typeof other === "object") {
    const valueKeys = Object.keys(value);
    const otherKeys = Object.keys(other);
    if (valueKeys.length !== otherKeys.length) return false;
    return valueKeys.every((key) => {
      if (!Object.prototype.hasOwnProperty.call(other, key)) return false;
      return isEqual((value as Record<string, unknown>)[key], (other as Record<string, unknown>)[key]);
    });
  }

  return value === other;
}
```

## 2. Testes Existentes

Não há teste dedicado para esta função. Cobertura real = 0%.

## 3. Projeto dos Casos de Teste (caixa-preta-primeiro)

### 3.1. Tabela de condições de entrada e classes de equivalência

| # | Classe | Entrada (exemplo) | Saída esperada |
| --- | --- | --- | --- |
| CE1 | Primitivos idênticos | `isEqual(1, 1)` / `isEqual("a","a")` | `true` |
| CE2 | Primitivos diferentes | `isEqual(1, 2)` | `false` |
| CE3 | Ambos `null` | `isEqual(null, null)` | `true` |
| CE4 | Um lado nulo | `isEqual(null, {})` / `isEqual(1, null)` | `false` |
| CE5 | Arrays de tamanhos diferentes | `isEqual([1], [1,2])` | `false` |
| CE6 | Arrays iguais | `isEqual([1,2], [1,2])` | `true` |
| CE7 | Arrays mesmo tamanho, elementos diferentes | `isEqual([1,2], [1,3])` | `false` |
| CE8 | Objetos com nº de chaves diferente | `isEqual({a:1}, {a:1,b:2})` | `false` |
| CE9 | Objetos iguais | `isEqual({a:1}, {a:1})` | `true` |
| CE10 | Objetos mesma qtd, chave diferente | `isEqual({a:1}, {b:1})` | `false` |
| CE11 | Objetos aninhados iguais (recursão) | `isEqual({a:{b:2}}, {a:{b:2}})` | `true` |
| CE12 | Tipos diferentes | `isEqual(1, "1")` | `false` |

### 3.2. Complemento caixa-branca — tabela de decisões

| ID | Decisão (linha) | Tipo | Observação |
| --- | --- | --- | --- |
| D1 | `value === other` (L3) | 1 condição | atalho de igualdade referencial/primitiva |
| D2 | `value == null \|\| other == null` (L4) | 2 condições | MC/DC aplicável |
| D3 | `Array.isArray(value) && Array.isArray(other)` (L7) | 2 condições | MC/DC aplicável |
| D4 | `value.length !== other.length` (L8) | 1 condição | — |
| D5 | `typeof value === "object" && typeof other === "object"` (L13) | 2 condições | MC/DC aplicável |
| D6 | `valueKeys.length !== otherKeys.length` (L17) | 1 condição | — |
| D7 | `!hasOwnProperty(other, key)` (L20) | 1 condição | chave ausente no outro |

### 3.3. MC/DC do complemento — Decisão D2 (`value == null || other == null`)

| Caso | value==null | other==null | Resultado |
| --- | --- | --- | --- |
| M1 | F | F | **F** |
| M2 | F | T | **T** |
| M3 | T | F | **T** |

Pares de independência: para `value==null` (M1, M3); para `other==null`
(M1, M2). (Mesma estrutura serve para D3 e D5, que são `&&`.)

## 4. Implementação dos Testes

Arquivo a criar: `packages/lib/isEqual.test.ts`.

- Os 12 casos de equivalência (CE1-CE12).
- Casos de complemento caixa-branca para cobrir D2, D3, D5 (MC/DC) e D7
  (objetos com mesma quantidade de chaves, mas chave divergente).

## 5. Resultado da Execução

```bash
TZ=UTC yarn vitest run packages/lib/isEqual.test.ts
```

## 6. Cobertura

| Momento | Cobertura esperada |
| --- | --- |
| Antes | 0% (sem teste dedicado) |
| Após | ~100% |

```bash
TZ=UTC npx vitest run packages/lib/isEqual.test.ts \
  --coverage.enabled \
  --coverage.include='packages/lib/isEqual.ts' \
  --coverage.reporter=text
```

## 7. TDD

O TDD único da equipe é o do Joaquim (`isPasswordValid`). Esta função não precisa
de ciclo próprio.

## 8. Insumos para a Análise Crítica

- A igualdade profunda é um caso onde a caixa-preta brilha: as classes de
  equivalência (primitivo, nulo, array, objeto, aninhado) saem direto da
  especificação.
- O complemento caixa-branca mostra um detalhe que a caixa-preta pode não cobrir:
  o ramo D7 (`!hasOwnProperty`), que trata objetos com a mesma quantidade de
  chaves, mas com chaves diferentes.
- Caso de fronteira interessante: array vs objeto (`isEqual([1], {0:1})`), porque
  `typeof []` é `"object"` — vale discutir como o código se comporta aí.
