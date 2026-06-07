# PTOSS-2 — Função do Joaquim: `isPasswordValid`

Documento de trabalho da função sob responsabilidade do Joaquim. Consolida tudo
que já foi definido para alimentar o relatório no template depois.

Documentos relacionados: [[ptoss-2-plano-geral]] · [[ptoss-2-test-method-selection]]

- **Arquivo:** `packages/lib/auth/isPasswordValid.ts`
- **Direção de projeto:** caixa-branca-primeiro → complemento caixa-preta
- **MC/DC:** sim (decisão composta `length >= 7 && (!strict || length > 14)`)
- **Cobertura real atual:** 0% (a função é mockada no único teste que a referencia)

## 1. Função

**Propósito.** Valida se uma senha atende às regras de complexidade do projeto.
Tem dois modos de retorno (overload):

- `isPasswordValid(password)` retorna `boolean`.
- `isPasswordValid(password, true, strict?)` retorna um objeto com o detalhamento
  `{ caplow, num, min, admin_min? }`.

**Regra de senha válida:**

- Modo normal: tem maiúscula **e** minúscula **e** dígito **e** `length >= 7`.
- Modo strict: tem maiúscula **e** minúscula **e** dígito **e** `length > 14`.

**Onde é usada:** `packages/features/auth/lib/next-auth-options.ts`,
`apps/web/app/api/auth/setup/route.ts` (modo strict para admin),
`apps/web/components/setup/AdminUser.tsx`. Há ainda uma cópia idêntica embutida
em `packages/prisma/zod-utils.ts` (linhas 40-56).

**Código atual (`packages/lib/auth/isPasswordValid.ts`):**

```ts
export function isPasswordValid(password: string): boolean;
export function isPasswordValid(
  password: string,
  breakdown: boolean,
  strict?: boolean
): { caplow: boolean; num: boolean; min: boolean; admin_min: boolean };
export function isPasswordValid(password: string, breakdown?: boolean, strict?: boolean) {
  let cap = false, // Has uppercase characters
    low = false, // Has lowercase characters
    num = false, // At least one number
    min = false, // Eight characters, or fifteen in strict mode.
    admin_min = false;
  if (password.length >= 7 && (!strict || password.length > 14)) min = true;
  if (strict && password.length > 14) admin_min = true;
  if (password.match(/\d/)) num = true;
  if (password.match(/[a-z]/)) low = true;
  if (password.match(/[A-Z]/)) cap = true;

  if (!breakdown) return cap && low && num && min && (strict ? admin_min : true);

  let errors: Record<string, boolean> = { caplow: cap && low, num, min };
  if (strict) errors = { ...errors, admin_min };

  return errors;
}
```

## 2. Testes Existentes

Não há teste **dedicado** para esta função. O único arquivo que a referencia é
`packages/features/auth/lib/next-auth-options.test.ts`, e ele **mocka** a função
(`vi.mock("@calcom/lib/auth/isPasswordValid", ...)` na linha 52). Portanto o
corpo real nunca é executado por nenhum teste, e a cobertura real é **0%**.

Isso torna esta função ideal para o trabalho: a cobertura "antes" é 0% e a
"após" será 100%, gerando um delta claro.

## 3. Projeto dos Casos de Teste (caixa-branca-primeiro)

### 3.1. Tabela de decisões e condições

| ID | Decisão (linha) | Condições | True | False |
| --- | --- | --- | --- | --- |
| D1 | `password.length >= 7 && (!strict || password.length > 14)` (L13) | A=`len>=7`, B=`!strict`, C=`len>14` | `min = true` | `min = false` |
| D2 | `strict && password.length > 14` (L14) | `strict`, `len>14` | `admin_min = true` | `admin_min = false` |
| D3 | `cap && low && num && min && (strict ? admin_min : true)` (L19) | `cap`, `low`, `num`, `min`, `admin_min` | retorna `true` | retorna `false` |

### 3.2. Tabela-verdade MC/DC — Decisão D1: `A && (B || C)`

Condições: **A** = `length >= 7`, **B** = `!strict`, **C** = `length > 14`.

| Caso | length | strict | A | B | C | Resultado (min) |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | 5 | false | F | T | F | **F** |
| M2 | 8 | false | T | T | F | **T** |
| M3 | 8 | true | T | F | F | **F** |
| M4 | 20 | true | T | F | T | **T** |

**Pares de independência:**

- **A:** (M1, M2) — B e C fixos; A muda F→T; resultado muda F→T.
- **B:** (M2, M3) — A e C fixos; B muda T→F; resultado muda T→F.
- **C:** (M3, M4) — A e B fixos; C muda F→T; resultado muda F→T.

Conjunto mínimo MC/DC: **{M1, M2, M3, M4}** (4 casos para 3 condições — o ideal
teórico n+1).

> Nota de continuidade: os comprimentos 5, 8 e 20 não são afetados pela mudança
> do Ciclo 1 do TDD (de `>= 7` para `>= 8`). A tabela MC/DC permanece válida
> após o TDD.

### 3.3. Complemento caixa-preta — particionamento de equivalência

| # | Condição de entrada | Classe válida | Classe inválida |
| --- | --- | --- | --- |
| CE1 | Maiúscula `[A-Z]` | V1: tem ao menos uma | I1: nenhuma |
| CE2 | Minúscula `[a-z]` | V2: tem ao menos uma | I2: nenhuma |
| CE3 | Dígito `\d` | V3: tem ao menos um | I3: nenhum |
| CE4 | Comprimento (normal) | V4: `>= 7` | I4: `< 7` |
| CE5 | Comprimento (strict) | V5: `> 14` | I5: `<= 14` |
| CE6 | `breakdown` | V6: `false` (bool) / V7: `true` (objeto) | — |

### 3.4. Complemento caixa-preta — análise de valor limite

| Modo | Limite | Entrada | Esperado |
| --- | --- | --- | --- |
| normal | logo abaixo | length 6 | inválido |
| normal | no limite | length 7 | válido (expõe divergência com o comentário) |
| strict | no limite inferior | length 14 | inválido |
| strict | primeiro válido | length 15 | válido |

## 4. Implementação dos Testes

Arquivo a criar: `packages/lib/auth/isPasswordValid.test.ts`.

Conteúdo planejado (suíte de caracterização, antes do TDD):

- 4 casos MC/DC da decisão D1 (M1 a M4).
- Casos de equivalência: senha sem maiúscula, sem minúscula, sem dígito, completa.
- Casos de valor limite: 6, 8 (normal); 14, 15 (strict).
- Casos do modo `breakdown` (retorno em objeto).

Observação importante para não conflitar com o TDD: a suíte de caracterização
deve fixar apenas os limites que **não mudam** com o TDD (6 inválido, 8 válido,
14 strict inválido, 15 strict válido). Os limites de 7 caracteres e de 72
caracteres serão exercitados pelos testes do TDD, escritos depois.

## 5. Resultado da Execução

A preencher com o print da execução:

```bash
TZ=UTC yarn vitest run packages/lib/auth/isPasswordValid.test.ts
```

## 6. Cobertura

| Momento | Cobertura esperada |
| --- | --- |
| Antes (só testes existentes) | 0% (função mockada, corpo real nunca executa) |
| Após (suíte de caracterização) | ~100% |

```bash
TZ=UTC yarn vitest run packages/lib/auth/isPasswordValid.test.ts \
  --coverage.enabled \
  --coverage.include='packages/lib/auth/isPasswordValid.ts' \
  --coverage.reporter=text
```

## 7. TDD (funcionalidade única da equipe)

Alvo: alinhar `isPasswordValid` à sua própria especificação documentada e ao
limite do bcrypt.

### Ciclo 1 — Mínimo de 8 caracteres

O comentário diz "Eight characters", o código aceita 7.

- **Red:** teste afirmando que `isPasswordValid("Abcde1f")` (7 caracteres, com
  maiúscula/minúscula/dígito) deve ser `false`. Hoje retorna `true` → falha.
- **Green:** alterar a condição para `password.length >= 8`.
- **Refactor:** extrair constantes `MIN_LENGTH = 8` e `ADMIN_MIN_LENGTH = 15`
  (`> 14` é equivalente a `>= 15`) e alinhar o comentário.

### Ciclo 2 — Máximo de 72 caracteres (limite do bcrypt)

O projeto usa bcryptjs (`packages/lib/auth/hashPassword.ts`), que trunca em 72
bytes.

- **Red:** teste afirmando que uma senha de 73 caracteres válida no resto deve
  ser `false`. Hoje retorna `true` → falha.
- **Green:** adicionar `password.length <= MAX_LENGTH` (72) à condição de `min`.
- **Refactor:** organizar `MAX_LENGTH = 72` junto às demais constantes.

### Estrutura de commits (conventional)

```text
test: add failing test for 8-char minimum password length
fix: enforce documented 8-char minimum in isPasswordValid
refactor: extract password length constants
test: add failing test for 72-char bcrypt limit
fix: reject passwords exceeding bcrypt 72-byte limit
```

### Pendência a decidir antes de alterar código

- Atualizar também a cópia duplicada em `packages/prisma/zod-utils.ts` para
  manter consistência? Isso toca dois pacotes.
- Criar branch antes de qualquer commit (não commitar direto na `main`).

## 8. Insumos para a Análise Crítica

- A precedência das verificações e a divergência comentário×código só ficam
  evidentes ao cruzar a especificação (caixa-preta) com a estrutura
  (caixa-branca).
- A análise de valor limite (limite de 7 caracteres) foi o que **revelou** o
  defeito que o TDD corrigiu — exemplo concreto de complementaridade.
- A duplicação da função em `zod-utils.ts` é um risco real de manutenção: uma
  correção pode passar despercebida na outra cópia.
