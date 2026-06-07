# PTOSS-2: Plano Geral da Equipe

Este documento é o mapa-mestre da atividade PTOSS-2. Ele consolida o que o
enunciado exige, como a equipe está organizada e — principalmente — quais
métodos **não podem ser misturados** entre si. Use-o como referência única para
evitar confusão e garantir que, no fim, tenhamos tudo que o trabalho e o
relatório precisam.

Documentos relacionados:

- [[ptoss-2-test-method-selection]] — seleção e justificativa das funções por integrante.

Documentos por integrante (instruções e análise de cada função):

- [[ptoss-2-funcao-rodrigo-extractHostTimezone]] — Rodrigo.
- [[ptoss-2-funcao-eduardo-isEqual]] — Eduardo.
- [[ptoss-2-funcao-anderson-parseTimeString]] — Anderson.
- [[ptoss-2-funcao-bruno-findContainingIntervals]] — Bruno.
- [[ptoss-2-funcao-john-subtract]] — John.
- [[ptoss-2-funcao-joaquim-isPasswordValid]] — Joaquim (também o alvo do TDD da equipe).

## 1. O Que o Enunciado Exige

O PTOSS-2 tem três atividades, mais o relatório técnico e o repositório.

| # | Atividade | Natureza | Quem faz |
| --- | --- | --- | --- |
| 1 | Testes unitários combinando caixa-preta **e** caixa-branca | Por função | Cada integrante na sua função (mínimo 6 funções, uma por integrante) |
| 2 | TDD com ciclos Red, Green e Refactor | **Uma única** funcionalidade/melhoria/correção | A equipe (um esforço só) |
| 3 | Análise crítica | Reflexão final | A equipe |

O **repositório** deve conter: código-fonte utilizado, testes implementados,
instruções de execução, relatórios de cobertura e histórico de commits
evidenciando o processo de desenvolvimento.

## 2. A Regra de Ouro — Duas Direções de Projeto

O enunciado pede **explicitamente** que a equipe demonstre as duas direções:

- projetar testes **iniciando com caixa-preta** e complementando com caixa-branca;
- projetar testes **iniciando com caixa-branca** e complementando com caixa-preta.

Consequência prática:

- **Cada função tem UM ponto de partida só.** Nunca se mistura as duas direções
  dentro da mesma função.
- A equipe, no conjunto, precisa ter **as duas direções representadas**.

Cada integrante deve declarar, no início da sua seção, se sua função é
**caixa-preta-primeiro** ou **caixa-branca-primeiro**, e seguir essa ordem no
relatório (perspectiva primária primeiro, complemento da perspectiva oposta
depois).

## 3. Taxonomia das Técnicas (para nunca rotular errado)

| Perspectiva | Técnicas (nomes exatos do enunciado) | Observação |
| --- | --- | --- |
| Caixa-preta | Particionamento de equivalência; Análise de valor limite | Baseadas na especificação/comportamento esperado |
| Caixa-branca | Cobertura de decisões/branches; MC/DC | MC/DC **apenas** para decisões com 2 ou mais condições |

### Erros que não podemos cometer

- Chamar particionamento de equivalência de "MC/DC".
- Montar tabela-verdade MC/DC para decisão de **uma só condição** (não há par de
  independência nesse caso).
- Apresentar a suíte de testes de uma função existente como se fosse TDD.

### A confusão mais perigosa: Caracterização vs TDD

| "Testes Desenvolvidos" (Atividade 1) | "TDD" (Atividade 2) |
| --- | --- |
| Testes para código que **já existe** | Implementa comportamento **novo** |
| Escritos depois do código | Teste escrito antes (precisa falhar primeiro) |
| São testes de caracterização/regressão | São Red, Green e Refactor |
| Cada um dos 6 integrantes faz o seu | Uma única, da equipe inteira |

## 4. Organização da Equipe

| Integrante | Função | Arquivo | Direção | Técnicas aplicadas | MC/DC? |
| --- | --- | --- | --- | --- | --- |
| Rodrigo | `extractHostTimezone` | `packages/lib/hashedLinksUtils.ts` | Caixa-branca → preta | branches + MC/DC; complementa com equivalência | Sim |
| Joaquim | `isPasswordValid` | `packages/lib/auth/isPasswordValid.ts` | Caixa-branca → preta | branches + MC/DC; complementa com equivalência e valor limite | Sim |
| Eduardo | `isEqual` | `packages/lib/isEqual.ts` | Caixa-preta → branca | equivalência; complementa com branches | Parcial (2 cond.) |
| Anderson | `parseTimeString` | `packages/features/schedules/components/ScheduleComponent.tsx` | Caixa-preta → branca | valor limite + equivalência; complementa com branches | Não |
| Bruno | `findContainingIntervals` | `packages/lib/intervalTree.ts` | Caixa-preta → branca | equivalência + valor limite; complementa com branches | Sim |
| John | `subtract` | `packages/features/schedules/lib/date-ranges.ts` | Caixa-preta → branca | equivalência; complementa com branches | Não |

Distribuição das direções: **2 funções caixa-branca-primeiro** (Rodrigo e
Joaquim) e **4 funções caixa-preta-primeiro** (Eduardo, Anderson, Bruno e John).
As duas direções exigidas ficam cobertas. O MC/DC aparece em **três** funções
(Rodrigo, Bruno e Joaquim), o que dá folga sobre o requisito.

### Auditoria de cobertura e mudanças na seleção

Foi feita uma auditoria medindo a cobertura real de cada função inicialmente
escolhida. Resultado: várias funções já estavam totalmente cobertas, sem permitir
implementação nova nem delta de cobertura antes/após. Por isso, quatro funções
foram trocadas por funções puras sem teste (0% de cobertura real).

| Integrante | Função inicial | Cobertura inicial | Ação | Função final |
| --- | --- | --- | --- | --- |
| Rodrigo | `getPrefetchMonthCount` | 100% | Trocou | `extractHostTimezone` |
| Eduardo | `getAvailabilityFromSchedule` | 100% | Trocou | `isEqual` |
| Bruno | `intersect` | 100% | Trocou | `findContainingIntervals` |
| Joaquim | `computeEffectiveStateAcrossTeams` | 100% | Trocou | `isPasswordValid` |
| Anderson | `parseTimeString` | ~95% | Manteve | `parseTimeString` |
| John | `subtract` | ~98% | Manteve | `subtract` |

Anderson e John mantiveram suas funções de propósito: o que sobra sem cobertura
nelas é **código inalcançável** (defensivo/redundante), e essa descoberta é
justamente o tipo de evidência que a seção "Integração entre as abordagens" do
enunciado pede — análise estrutural revelando algo que o teste funcional não
mostra. Detalhes na seção 8.

## 5. O Que Cada Integrante Entrega (mapeado ao template)

Para cada função, seguir as subseções do template:

1. **Função N** — nome, propósito, comportamento, código e link no fork.
2. **Testes Existentes** — código dos testes já presentes no projeto + link.
3. **Projeto dos Casos de Teste** — conforme a direção da função:
   - Caixa-branca-primeiro: tabela de decisões/condições, tabela-verdade com
     pares de independência (MC/DC), casos projetados e **complemento**
     caixa-preta.
   - Caixa-preta-primeiro: tabela de condições de entrada/saída com classes
     válidas e inválidas numeradas, casos projetados e **complemento**
     caixa-branca (branches).
4. **Implementação dos Testes** — código dos casos implementados + link.
5. **Resultado da Execução** — prints dos testes passando.
6. **Cobertura** — antes e após, com rastreabilidade técnica ↔ teste.

## 6. Seções de Responsabilidade da Equipe

| Seção do relatório | Dono sugerido |
| --- | --- |
| Introdução | a definir |
| Descrição do Projeto (Cal.com) | a definir |
| Planejamento dos Testes | a definir |
| Descrição das Técnicas Utilizadas | a definir |
| TDD (a funcionalidade única) | Joaquim (`isPasswordValid`) |
| Análise Crítica | equipe toda |
| Conclusão | a definir |

## 7. O TDD da Equipe

Funcionalidade única escolhida: melhoria/correção em `isPasswordValid`.

- **Ciclo 1:** exigir mínimo de 8 caracteres (corrige divergência entre o
  comentário "Eight characters" e o código `>= 7`).
- **Ciclo 2:** rejeitar senhas acima de 72 caracteres (limite de truncamento do
  bcrypt, usado em `packages/lib/auth/hashPassword.ts`).

Cada ciclo segue Red (teste falhando) → Green (implementação mínima) → Refactor
(melhoria mantendo os testes verdes). Detalhes em
[[ptoss-2-funcao-joaquim-isPasswordValid]].

## 8. Achados da Auditoria de Cobertura

A auditoria mediu a cobertura real (via vitest + v8) de cada função e produziu
três tipos de achado.

### 8.1. Funções já 100% cobertas (motivaram troca)

`getPrefetchMonthCount`, `getAvailabilityFromSchedule` e `intersect` estavam com
100% em statements e branches. Sem implementação nova nem delta possível. Foram
trocadas (ver seção 4).

### 8.2. Código inalcançável (ângulo de caixa-branca para Anderson e John)

- **`parseTimeString` (Anderson):** a guarda
  `if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null`
  (linhas 416-417) é **código morto**. O parsing estrito do dayjs (linhas
  409-411) já rejeita entradas como "24:00" e "16:60" antes de chegar lá. Nenhum
  teste consegue alcançar a linha 417. Cobertura presa em ~95%, e o motivo é o
  achado.
- **`subtract` (John):** a condição
  `if (excludedRange.end.valueOf() > currentStart.valueOf())` (linha 441) é
  **sempre verdadeira** nesse ponto, porque o guard da linha 435
  (`continue` quando `end <= currentStart`) já garante isso. O ramo falso é
  inalcançável (redundância defensiva).

Esses dois achados são insumo direto para a análise crítica: estrutura revelando
o que o teste funcional não revela. Opcionalmente, remover esse código morto
poderia ser um refactor — mas o TDD único da equipe já é o do Joaquim.

### 8.3. Função duplicada

`isPasswordValid` tem uma cópia idêntica em `packages/prisma/zod-utils.ts`
(linhas 40-56). É ótimo material para a análise crítica (risco de duplicação), e
o TDD precisa decidir se altera as duas cópias para mantê-las consistentes.

### 8.4. Comandos da auditoria (reprodutível)

```bash
# Cobertura focada em um arquivo, com relatório JSON para inspeção por linha
TZ=UTC npx vitest run <arquivo>.test.ts \
  --coverage.enabled \
  --coverage.include='<arquivo de implementação>' \
  --coverage.reporter=json \
  --coverage.reportsDirectory=/tmp/cov
```

## 9. Ordem de Trabalho Recomendada

1. **Fase 0** — Cada integrante roda a cobertura da sua função para conhecer o
   ponto de partida.
2. **Fase 1** — Cada um monta as tabelas de projeto na sua direção
   (preta-primeiro ou branca-primeiro).
3. **Fase 2** — Implementa/complementa os testes e captura a cobertura antes e
   após.
4. **Fase 3** — TDD único na `isPasswordValid`: dois ciclos Red/Green/Refactor.
5. **Fase 4** — Análise crítica coletiva e montagem do relatório no template.
6. **Fase 5** — Repositório: instruções de execução, relatórios de cobertura e
   commits organizados.

## 10. Comandos Úteis

```bash
# Rodar os testes de um arquivo específico
TZ=UTC yarn vitest run caminho/para/arquivo.test.ts

# Rodar com cobertura focada em um arquivo de implementação
TZ=UTC yarn vitest run caminho/para/arquivo.test.ts \
  --coverage.enabled \
  --coverage.include='caminho/para/implementacao.ts' \
  --coverage.reporter=text

# Verificação de tipos antes de concluir
yarn type-check:ci --force

# Lint e formatação
yarn biome check --write .
```
