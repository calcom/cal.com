# PTOSS-2: Seleção de Métodos para Testes Unitários

Este documento registra a seleção inicial de métodos para a atividade PTOSS-2, considerando uma equipe com seis integrantes. Para cada função, foram mapeadas a funcionalidade, as técnicas de caixa-preta e caixa-branca aplicáveis, os principais casos de teste, os branches esperados e a justificativa da escolha.

O mapa-mestre da atividade (organização, regras de não-mistura de técnicas e divisão por direção de projeto) está em [[ptoss-2-plano-geral]]. O detalhamento da função do Joaquim está em [[ptoss-2-funcao-joaquim-isPasswordValid]].

## 1. `extractHostTimezone`

Arquivo: `packages/lib/hashedLinksUtils.ts`

> **Troca em relação à seleção inicial.** Substituiu `getPrefetchMonthCount`, que
> já estava com **100% de cobertura** (sem implementação nova nem delta possível).
> A `extractHostTimezone` tem **0% de cobertura** (sem teste dedicado) e decisões
> de até três condições, ideais para MC/DC.

| Item | Descrição |
| --- | --- |
| Direção de projeto | Caixa-branca-primeiro, complementando com caixa-preta. |
| Funcionalidade | Extrai o fuso horário do host a partir dos dados do tipo de evento (pessoal, time com hosts, time com membros) ou cai no fallback `dayjs.tz.guess()`. |
| Técnica caixa-branca usada | Cobertura de branches e MC/DC nas decisões compostas `userId && owner?.timeZone` (2 cond.), `hosts && hosts.length > 0 && hosts[0]?.user?.timeZone` (3 cond.) e a equivalente para `team.members` (3 cond.). |
| Técnica caixa-preta usada | Particionamento de equivalência por tipo de evento: pessoal com owner, time com hosts, time com membros, e fallback sem dados de fuso. |
| Casos de teste | Evento pessoal retorna o fuso do owner; time com host válido retorna o fuso do host; time sem host mas com membro retorna o fuso do membro; ausência de dados cai no fallback. |
| Branches cobertos | Ramo `userId`; ramo `teamId`; ramo `hosts`; ramo `team.members`; retorno fallback. |
| Justificativa | Função pura com decisões de múltiplas condições aninhadas, ideal para MC/DC. Nota: o fallback usa `dayjs.tz.guess()` (dependente do ambiente); no teste do fallback basta verificar que retorna uma string. |

## 2. `isEqual`

Arquivo: `packages/lib/isEqual.ts`

> **Troca em relação à seleção inicial.** Substituiu `getAvailabilityFromSchedule`,
> que já estava com **100% de cobertura** (statements e branches). A `isEqual` tem
> **0% de cobertura** (sem teste dedicado) e classes de equivalência muito limpas.

| Item | Descrição |
| --- | --- |
| Direção de projeto | Caixa-preta-primeiro, complementando com caixa-branca. |
| Funcionalidade | Compara dois valores por igualdade profunda recursiva, tratando primitivos, `null`/`undefined`, arrays e objetos. |
| Técnica caixa-preta usada | Particionamento de equivalência por tipo: primitivos iguais/diferentes; `null`/`undefined`; arrays (mesmo tamanho, tamanho diferente, elementos diferentes); objetos (mesmas chaves, chaves diferentes, valores diferentes); tipos mistos. |
| Técnica caixa-branca usada | Cobertura de branches de cada `if` e das decisões de 2 condições `value == null || other == null` e `Array.isArray(value) && Array.isArray(other)`. |
| Casos de teste | Mesma referência retorna `true`; um lado `null` retorna `false`; arrays de tamanhos diferentes retornam `false`; arrays iguais retornam `true`; objetos com chaves diferentes retornam `false`; objetos aninhados iguais retornam `true`; tipos diferentes retornam `false`. |
| Branches cobertos | `value === other`; `value == null \|\| other == null`; ramo de arrays; ramo de objetos; comparação final de primitivos. |
| Justificativa | Igualdade profunda tem partições de equivalência naturais e nítidas, ideal para começar pela caixa-preta. A recursão e os ramos de tipo dão um bom complemento estrutural. |

## 3. `parseTimeString`

Arquivo: `packages/features/schedules/components/ScheduleComponent.tsx`

| Item | Descrição |
| --- | --- |
| Funcionalidade | Converte uma string de horário em `Date`, respeitando formato 12h ou 24h, ou retorna `null` para entradas inválidas. |
| Técnica caixa-preta usada | Análise de valor limite e particionamento por formato: entradas vazias, formato 24h, formato 12h, horários mínimos/máximos válidos e valores inválidos. |
| Técnica caixa-branca usada | Cobertura de branches: entrada vazia, parsing inválido, validação de hora/minuto e retorno válido. |
| Casos de teste | `""` e `"   "` retornam `null`; `"00:00"` é válido; `"23:59"` é válido; `"24:00"` é inválido; `"16:60"` é inválido; `"4:05pm"` é válido; `"12:00am"` vira `00:00`; `"12:00pm"` vira `12:00`; `"invalid"` retorna `null`. |
| Branches cobertos | `!input.trim()`; `timeFormat === 12`; `!parsed.isValid()`; validação `hours > 23`; validação `minutes > 59`; retorno com `Date`. |
| Justificativa | Excelente para análise de valor limite, porque horários têm fronteiras naturais: `00:00`, `23:59`, `24:00`, minuto `59` e minuto `60`. |

> **Nota da auditoria (mantida de propósito).** A função já está ~95% coberta. O
> que resta sem cobertura é a guarda `if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null`
> (linhas 416-417): é **código inalcançável**, porque o parsing estrito do dayjs
> (linhas 409-411) já rejeita "24:00"/"16:60" antes. Esse achado de caixa-branca
> é o ângulo principal desta função e alimenta a seção de complementaridade do
> relatório.

## 4. `isPasswordValid`

Arquivo: `packages/lib/auth/isPasswordValid.ts`

Detalhamento completo em [[ptoss-2-funcao-joaquim-isPasswordValid]].

> **Troca em relação à seleção inicial.** Esta função substituiu
> `computeEffectiveStateAcrossTeams`, que já estava com **100% de cobertura**
> (statements, branches, functions e lines) e não permitia delta de cobertura
> antes/após nem implementação nova. A `isPasswordValid` tem **0% de cobertura
> real** (é mockada no único teste que a referencia), decisão composta para
> MC/DC e um defeito real que serve de alvo para o TDD.

| Item | Descrição |
| --- | --- |
| Direção de projeto | Caixa-branca-primeiro, complementando com caixa-preta. |
| Funcionalidade | Valida se uma senha atende às regras de complexidade (maiúscula, minúscula, dígito e comprimento), em modo normal ou strict, com retorno booleano ou detalhado. |
| Técnica caixa-branca usada | Cobertura de decisões/branches e MC/DC na decisão composta `length >= 7 && (!strict \|\| length > 14)`. |
| Técnica caixa-preta usada | Particionamento de equivalência (maiúscula/minúscula/dígito presentes ou não) e análise de valor limite no comprimento. |
| Casos de teste | 4 casos MC/DC (comprimentos 5, 8 e 20 com `strict` variando); senha sem maiúscula/minúscula/dígito; valores limite 6, 7, 14 e 15; modo `breakdown` com retorno em objeto. |
| Branches cobertos | Decisão de `min`; decisão de `admin_min`; `num`, `low`, `cap`; ramo `breakdown` falso (retorno booleano) e verdadeiro (retorno objeto); ramo `strict` no objeto. |
| Justificativa | Função pura, sem dependências, com decisão composta ideal para MC/DC e valor limite natural no comprimento. A divergência entre o comentário ("Eight characters") e o código (`>= 7`) também a torna o alvo perfeito do TDD. |

## 5. `findContainingIntervals`

Arquivo: `packages/lib/intervalTree.ts` (classe `ContainmentSearchAlgorithm`)

> **Troca em relação à seleção inicial.** Substituiu `intersect`, que já estava
> com **100% de cobertura**. A `findContainingIntervals` tem **0% de cobertura**
> (sem teste dedicado) e mantém o domínio de intervalos, com decisão de três
> condições para MC/DC.

| Item | Descrição |
| --- | --- |
| Direção de projeto | Caixa-preta-primeiro, complementando com caixa-branca. |
| Funcionalidade | Busca, numa árvore de intervalos, todos os nós cujo intervalo contém o intervalo alvo, ignorando o próprio índice. |
| Técnica caixa-preta usada | Particionamento por relação de contenção: contido, não contido, mesmo índice (self), intervalo degenerado (`end < start`); e análise de valor limite nas bordas `start <= targetStart` e `end >= targetEnd` (iguais vs estritamente dentro). |
| Técnica caixa-branca usada | Cobertura de branches da recursão e MC/DC na decisão de três condições `node.start <= targetStart && node.end >= targetEnd && node.index !== targetIndex` (linha 82). |
| Casos de teste | Árvore vazia retorna `[]`; nó que contém o alvo é incluído; nó com mesmo índice do alvo é ignorado; nó degenerado desce para os filhos; bordas exatamente iguais contam como contenção; alvo fora de todos não retorna nenhum. |
| Branches cobertos | `!node`; `node.end < node.start`; decisão composta de contenção; `node.left && node.left.maxEnd >= targetStart`; `node.right && node.start <= targetEnd`. |
| Justificativa | Mantém o domínio de intervalos do integrante, tem valor limite natural nas comparações `<=`/`>=` e uma decisão de três condições perfeita para o complemento MC/DC. |

## 6. `subtract`

Arquivo: `packages/features/schedules/lib/date-ranges.ts`

| Item | Descrição |
| --- | --- |
| Funcionalidade | Remove intervalos excluídos de uma lista de intervalos base, retornando os pedaços restantes. |
| Técnica caixa-preta usada | Particionamento por tipo de sobreposição: nenhuma sobreposição, exclusão antes, exclusão depois, exclusão total, exclusão no início, exclusão no fim e exclusão no meio. |
| Técnica caixa-branca usada | Cobertura de branches: `break`, `continue`, criação de trecho anterior à exclusão, atualização de `currentStart` e criação do trecho restante final. |
| Casos de teste | Excluded range antes do source mantém source inteiro; excluded depois do source mantém source inteiro; excluded cobrindo tudo retorna `[]`; excluded no meio divide em dois intervalos; excluded no início retorna apenas o final; excluded no fim retorna apenas o começo; múltiplas exclusões retornam múltiplos pedaços. |
| Branches cobertos | `excludedRange.start >= sourceEnd`; `excludedRange.end <= currentStart`; `excludedRange.start > currentStart`; `excludedRange.end > currentStart`; `sourceEnd > currentStart`. |
| Justificativa | Muito adequada para combinar caixa-preta e caixa-branca, porque a especificação funcional é intuitiva e os branches internos correspondem diretamente aos tipos de sobreposição entre intervalos. |

> **Nota da auditoria (mantida de propósito).** A função já está ~98% coberta. O
> ramo sem cobertura é o `false` da condição `if (excludedRange.end.valueOf() > currentStart.valueOf())`
> (linha 441): é **inalcançável**, porque o guard da linha 435 (`continue` quando
> `end <= currentStart`) já garante que `end > currentStart` nesse ponto. É uma
> redundância defensiva, e esse achado de caixa-branca é o ângulo principal desta
> função.

## Resumo da Distribuição

| Integrante | Função | Direção | Cobertura inicial | Força principal |
| --- | --- | --- | --- | --- |
| Rodrigo | `extractHostTimezone` | Caixa-branca → preta | 0% | MC/DC em decisões aninhadas |
| Eduardo | `isEqual` | Caixa-preta → branca | 0% | Particionamento de equivalência |
| Anderson | `parseTimeString` | Caixa-preta → branca | ~95% | Valor limite + achado de código morto |
| Joaquim | `isPasswordValid` | Caixa-branca → preta | 0% | MC/DC e valor limite (alvo do TDD) |
| Bruno | `findContainingIntervals` | Caixa-preta → branca | 0% | Intervalos, valor limite e MC/DC |
| John | `subtract` | Caixa-preta → branca | ~98% | Branches + achado de guard redundante |

## Observação

A seleção combina funções pequenas e testáveis com funções de maior riqueza estrutural. Isso ajuda a demonstrar a complementaridade entre caixa-preta e caixa-branca sem transformar o trabalho em uma análise excessivamente grande ou dependente de banco de dados, UI ou serviços externos.

## O Que Ainda Falta Para a Atividade

Esta seleção de métodos resolve apenas a primeira decisão do trabalho: quais funções serão analisadas e testadas. Para atender completamente ao enunciado da PTOSS-2, ainda falta produzir as evidências, implementar ou complementar testes, aplicar TDD em uma mudança real e consolidar tudo no relatório.

| Necessidade da atividade | Situação atual | O que falta fazer |
| --- | --- | --- |
| Escolher métodos em quantidade mínima igual ao número de integrantes | Seis funções foram selecionadas para seis integrantes. | Confirmar se a equipe aceita a distribuição e se cada integrante ficará responsável por uma função. |
| Projetar testes caixa-preta | Técnicas e casos principais foram mapeados neste documento. | Transformar os casos em uma tabela mais detalhada por função, com entradas, saída esperada e técnica aplicada. |
| Projetar testes caixa-branca | Branches principais foram identificados. | Conferir a cobertura real após executar os testes e ajustar os casos para cobrir branches não exercitados. |
| Evidenciar MC/DC | Há bons candidatos: `getPrefetchMonthCount` e `computeEffectiveStateAcrossTeams`. | Montar uma tabela MC/DC mostrando como cada condição independente altera o resultado da decisão. |
| Implementar testes unitários | Algumas funções já possuem testes no projeto. | Verificar os testes existentes, complementar lacunas e garantir que cada integrante tenha contribuição rastreável. |
| Gerar métricas de cobertura | Ainda não feito neste documento. | Executar testes com cobertura e salvar o relatório/print ou saída do terminal. |
| Demonstrar complementaridade entre caixa-preta e caixa-branca | A justificativa inicial está descrita por função. | Escrever uma análise comparando casos funcionais com os branches realmente cobertos. |
| Aplicar TDD | Ainda não definido. | Escolher uma melhoria pequena, criar teste falhando, implementar o mínimo e refatorar. |
| Documentar Red, Green e Refactor | Ainda não feito. | Fazer commits separados ou registrar evidências do teste falhando, passando e da refatoração. |
| Produzir análise crítica | Ainda não feito. | Escrever reflexão sobre testabilidade, dificuldades, limitações das técnicas e impacto do TDD. |
| Preparar relatório técnico | Ainda não feito. | Montar o relatório com introdução, projeto, planejamento, técnicas, testes, cobertura, TDD, análise crítica e conclusão. |
| Preparar repositório final | Parcial. | Incluir instruções de execução, testes implementados, relatórios de cobertura e histórico de commits. |

## Próximos Passos

1. Confirmar a distribuição das seis funções entre os integrantes.
2. Para cada função, transformar os casos sugeridos em uma tabela de teste com: identificador, técnica, entrada, saída esperada, classe de equivalência ou valor limite, branch esperado e observação.
3. Rodar os testes existentes relacionados às funções escolhidas para entender a base atual.
4. Complementar os testes que ainda não cobrem os casos planejados, mantendo os arquivos de teste já existentes quando possível.
5. Rodar cobertura para os arquivos/funções selecionados.
6. Comparar o planejamento com a cobertura real e registrar lacunas encontradas.
7. Escolher uma melhoria pequena para TDD.
8. Executar o ciclo TDD com evidências:
   - Red: teste criado e falhando;
   - Green: implementação mínima passando;
   - Refactor: melhoria mantendo os testes aprovados.
9. Escrever a análise crítica da equipe.
10. Consolidar o relatório técnico e as instruções de execução no repositório.

## Melhor Caminho Recomendado

O caminho mais seguro é tratar o trabalho em três frentes pequenas: planejamento, implementação dos testes e documentação das evidências. Isso evita que a equipe comece implementando testes sem conseguir explicar depois qual técnica foi aplicada.

### 1. Planejamento dos Testes

Antes de alterar código, cada integrante deve criar uma tabela detalhada para sua função. Um modelo simples:

| ID | Função | Técnica | Entrada | Saída esperada | Classe/limite/branch | Justificativa |
| --- | --- | --- | --- | --- | --- | --- |
| TC-01 | `parseTimeString` | Valor limite | `"23:59"`, `24` | `Date` com 23h59 | Limite superior válido | Garante aceitação do maior horário válido no formato 24h. |
| TC-02 | `parseTimeString` | Valor limite | `"24:00"`, `24` | `null` | Primeiro valor inválido após o limite | Garante rejeição fora do intervalo permitido. |

Essa tabela deve ser feita para todas as seis funções. Ela será a base da rastreabilidade entre funcionalidade e testes implementados.

### 2. Implementação dos Testes

Priorizar testes unitários puros, sem banco de dados, rede ou UI. A ordem recomendada é:

1. `getPrefetchMonthCount`
2. `parseTimeString`
3. `getAvailabilityFromSchedule`
4. `intersect`
5. `subtract`
6. `computeEffectiveStateAcrossTeams`

Essa ordem começa pelas funções mais diretas e deixa a tabela de decisão mais complexa para depois, quando a equipe já tiver padronizado a forma dos testes.

Quando existirem testes prontos no projeto, a equipe deve avaliar se eles já cobrem os casos planejados. Se não cobrirem, o melhor caminho é complementar os testes existentes em vez de criar arquivos paralelos sem necessidade.

### 3. Evidências de Cobertura

Para a atividade, não basta dizer que os testes passaram. É importante guardar evidências como:

- saída do comando de testes;
- relatório de cobertura;
- tabela comparando branches planejados e branches cobertos;
- prints ou trechos do relatório, se necessário para a entrega;
- commits mostrando a evolução dos testes.

Comandos úteis no projeto:

```bash
TZ=UTC yarn test
yarn type-check:ci --force
yarn biome check --write .
```

Se a equipe for rodar apenas testes específicos, usar o comando de teste do workspace apontando para os arquivos alterados. Depois, antes da entrega final, rodar pelo menos os testes relevantes e o type check.

### 4. Sugestão Para a Parte de TDD

A parte de TDD deve ser pequena e isolada. Evitar funcionalidades grandes, schema de banco ou mudanças que afetem muitos pacotes.

Bons candidatos:

| Opção | Ideia | Por que é boa para TDD |
| --- | --- | --- |
| `parseTimeString` | Aceitar variações simples de entrada, como espaços ao redor de um horário válido. | É uma mudança pequena, fácil de testar e com comportamento claro. |
| `getAvailabilityFromSchedule` | Garantir comportamento explícito para dias vazios entre dias com disponibilidade. | Mantém a função pura e fácil de validar. |
| `subtract` | Adicionar ou documentar comportamento para exclusões adjacentes ao intervalo base. | Trabalha com limites e tem baixo acoplamento. |

O fluxo recomendado de commits para evidenciar TDD:

```text
test: add failing test for selected behavior
fix: implement selected behavior
refactor: simplify selected behavior
```

No relatório, registrar para cada etapa:

| Etapa | Evidência esperada |
| --- | --- |
| Red | Teste novo falhando, com mensagem de erro ou print/saída do terminal. |
| Green | Implementação mínima e teste passando. |
| Refactor | Pequena melhoria no código, mantendo todos os testes passando. |

### 5. Estrutura Recomendada do Relatório

O relatório pode seguir exatamente a estrutura pedida no enunciado:

1. Introdução
2. Descrição do projeto Cal.com
3. Planejamento dos testes
4. Descrição das técnicas utilizadas
5. Testes desenvolvidos
6. Métricas de cobertura
7. Processo de TDD
8. Análise crítica
9. Conclusão

Na seção de testes desenvolvidos, usar uma subseção por função. Em cada subseção, incluir:

- objetivo da função;
- casos caixa-preta;
- casos caixa-branca;
- tabela MC/DC quando aplicável;
- cobertura obtida;
- lacunas ou limitações.

### 6. Rastreabilidade

Para facilitar a correção, cada teste deve apontar para a função e para a técnica aplicada. A equipe pode usar identificadores como:

| ID | Função | Técnica | Teste implementado |
| --- | --- | --- | --- |
| GPMC-01 | `getPrefetchMonthCount` | Particionamento de equivalência | `returns 2 for column view with different months` |
| GPMC-02 | `getPrefetchMonthCount` | MC/DC | `returns undefined when prefetchNextMonth is true in month view` |
| PTS-01 | `parseTimeString` | Valor limite | `returns a date for 23:59 in 24-hour format` |
| SUB-01 | `subtract` | Particionamento por sobreposição | `splits a source range when excluded range is in the middle` |

Essa rastreabilidade deve aparecer no relatório ou em um documento auxiliar.

## Checklist Final Antes da Entrega

- [ ] Seis funções confirmadas, uma por integrante.
- [ ] Tabelas de casos de teste completas.
- [ ] Testes caixa-preta implementados.
- [ ] Testes caixa-branca implementados.
- [ ] MC/DC documentado para pelo menos uma decisão complexa.
- [ ] Cobertura coletada e registrada.
- [ ] Parte de TDD realizada com evidências Red, Green e Refactor.
- [ ] Análise crítica escrita.
- [ ] Instruções de execução adicionadas ao repositório.
- [ ] Relatório técnico finalizado.
- [ ] Commits organizados e com mensagens claras.
