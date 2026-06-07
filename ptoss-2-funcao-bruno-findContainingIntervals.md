# PTOSS-2 — Função do Bruno: `findContainingIntervals`

Documento de trabalho da função sob responsabilidade do Bruno.

Documentos relacionados: [[ptoss-2-plano-geral]] · [[ptoss-2-test-method-selection]]

- **Arquivo:** `packages/lib/intervalTree.ts` (classe `ContainmentSearchAlgorithm`)
- **Direção de projeto:** caixa-preta-primeiro → complemento caixa-branca
- **MC/DC:** sim (decisão de 3 condições na L82)
- **Cobertura real atual:** 0% (sem teste dedicado)

## 1. Função

**Propósito.** Dada uma árvore de intervalos, encontra todos os nós cujo intervalo
**contém** o intervalo alvo (`start <= targetStart` e `end >= targetEnd`),
ignorando o próprio índice do alvo. Usa a `maxEnd` de cada subárvore para podar a
busca.

**Código relevante (`packages/lib/intervalTree.ts`, linhas 61-93):**

```ts
findContainingIntervals(targetStart: number, targetEnd: number, targetIndex: number): IntervalNode<T>[] {
  const result: IntervalNode<T>[] = [];
  this.searchContaining(this.tree.getRoot(), targetStart, targetEnd, targetIndex, result);
  return result;
}

private searchContaining(node, targetStart, targetEnd, targetIndex, result): void {
  if (!node) return;

  if (node.end < node.start) {
    this.searchContaining(node.left, ...);
    this.searchContaining(node.right, ...);
    return;
  }

  if (node.start <= targetStart && node.end >= targetEnd && node.index !== targetIndex) {
    result.push(node);
  }

  if (node.left && node.left.maxEnd >= targetStart) {
    this.searchContaining(node.left, ...);
  }

  if (node.right && node.start <= targetEnd) {
    this.searchContaining(node.right, ...);
  }
}
```

## 2. Testes Existentes

Não há teste dedicado para o módulo `intervalTree.ts`. Cobertura real = 0%.

## 3. Projeto dos Casos de Teste (caixa-preta-primeiro)

### 3.1. Setup necessário

```ts
import { createIntervalNodes, IntervalTree, ContainmentSearchAlgorithm } from "@calcom/lib/intervalTree";

function buildSearch(intervals: { start: number; end: number }[]) {
  const nodes = createIntervalNodes(intervals, (i) => i.start, (i) => i.end);
  const tree = new IntervalTree(nodes);
  return new ContainmentSearchAlgorithm(tree);
}
```

### 3.2. Particionamento de equivalência

| # | Classe | Cenário | Saída esperada |
| --- | --- | --- | --- |
| CE1 | Árvore vazia | `[]` | `[]` |
| CE2 | Nó contém o alvo | nó [0,100], alvo [10,20] | nó incluído |
| CE3 | Nó não contém (começa depois) | nó [50,100], alvo [10,20] | não incluído |
| CE4 | Nó não contém (termina antes) | nó [0,15], alvo [10,20] | não incluído |
| CE5 | Nó é o próprio alvo (índice igual) | nó [0,100] index 0, alvo index 0 | ignorado |
| CE6 | Nó degenerado (`end < start`) | nó [100,0] | desce aos filhos, não se inclui |
| CE7 | Múltiplos nós contendo | dois nós que contêm | ambos incluídos |

### 3.3. Análise de valor limite

| # | Limite | Cenário | Saída esperada |
| --- | --- | --- | --- |
| VL1 | bordas exatamente iguais | nó [10,20], alvo [10,20] | contido (`<=` e `>=`) |
| VL2 | início 1 acima | nó [11,20], alvo [10,20] | não contido |
| VL3 | fim 1 abaixo | nó [10,19], alvo [10,20] | não contido |

### 3.4. Complemento caixa-branca — decisões

| ID | Decisão (linha) | Tipo |
| --- | --- | --- |
| D1 | `!node` (L74) | 1 condição |
| D2 | `node.end < node.start` (L76) | 1 condição (degenerado) |
| D3 | `node.start <= targetStart && node.end >= targetEnd && node.index !== targetIndex` (L82) | 3 condições (MC/DC) |
| D4 | `node.left && node.left.maxEnd >= targetStart` (L86) | 2 condições |
| D5 | `node.right && node.start <= targetEnd` (L90) | 2 condições |

### 3.5. Tabela-verdade MC/DC — Decisão D3 (`A && B && C`)

Condições: **A** = `node.start <= targetStart`, **B** = `node.end >= targetEnd`,
**C** = `node.index !== targetIndex`.

| Caso | A | B | C | Resultado (inclui?) |
| --- | --- | --- | --- | --- |
| M1 | F | T | T | **F** |
| M2 | T | F | T | **F** |
| M3 | T | T | F | **F** |
| M4 | T | T | T | **T** |

Pares de independência: **A** = (M1, M4); **B** = (M2, M4); **C** = (M3, M4).
Conjunto mínimo: {M1, M2, M3, M4}.

> Como construir: M1 → nó começa depois do alvo; M2 → nó termina antes do alvo;
> M3 → nó contém mas é o próprio índice do alvo; M4 → nó contém e índice diferente.

## 4. Implementação dos Testes

Arquivo a criar: `packages/lib/intervalTree.test.ts`.

- 7 casos de equivalência (CE1-CE7) + 3 de valor limite (VL1-VL3).
- 4 casos MC/DC de D3 (M1-M4).
- Casos para exercitar a poda: filhos à esquerda/direita (D4, D5).

## 5. Resultado da Execução

```bash
TZ=UTC yarn vitest run packages/lib/intervalTree.test.ts
```

## 6. Cobertura

| Momento | Cobertura esperada |
| --- | --- |
| Antes | 0% (sem teste dedicado) |
| Após | ~100% |

```bash
TZ=UTC npx vitest run packages/lib/intervalTree.test.ts \
  --coverage.enabled \
  --coverage.include='packages/lib/intervalTree.ts' \
  --coverage.reporter=text
```

## 7. TDD

O TDD único da equipe é o do Joaquim (`isPasswordValid`). Esta função não precisa
de ciclo próprio.

## 8. Insumos para a Análise Crítica

- Mantém o domínio de intervalos, mas com estrutura de árvore: bom para discutir
  como a poda (`maxEnd`) e a recursão exigem casos estruturais que a especificação
  pura não evidencia.
- A decisão de 3 condições (D3) é um caso forte de MC/DC: contenção pelas duas
  bordas mais a exclusão do próprio índice.
- Valor limite nas bordas (`<=`/`>=`) define a diferença entre "encostar" e
  "conter" — fronteira central da função.
