# Google Calendar Service - Batching de Disponibilidade

## Visao Geral

O `CalendarService` do Google Calendar implementa uma estrategia otimizada para buscar disponibilidade de calendarios, lidando com as limitacoes da API do Google Calendar de forma eficiente.

## Como Funciona

### Fluxo Principal de Disponibilidade

O metodo `getAvailability()` e o ponto de entrada principal para buscar horarios ocupados dos calendarios do usuario:

```typescript
async getAvailability(
  dateFrom: string,
  dateTo: string,
  selectedCalendars: IntegrationCalendar[],
  fallbackToPrimary?: boolean
): Promise<EventBusyDate[]>
```

#### Etapas do Processo:

1. **Filtragem de Calendarios**: Filtra apenas calendarios do tipo `google_calendar` da lista de calendarios selecionados

2. **Early Return**: Se nenhum calendario Google foi selecionado (apenas outras integracoes), retorna array vazio imediatamente

3. **Obtencao de IDs**: Chama `getCalendarIds()` para obter os IDs dos calendarios a serem consultados

4. **Busca de Dados**: Chama `fetchAvailabilityData()` para buscar os horarios ocupados

### Logica de Fallback para Calendario Primario

O metodo `getCalendarIds()` implementa a logica de fallback:

```typescript
private async getCalendarIds(
  selectedCalendarIds: string[],
  fallbackToPrimary?: boolean
): Promise<string[]>
```

- Se ha calendarios selecionados, retorna esses IDs diretamente
- Se nao ha calendarios selecionados e `fallbackToPrimary` e `true`, retorna apenas o calendario primario
- Se nao ha calendarios selecionados e `fallbackToPrimary` e `false`, retorna todos os calendarios validos

### Batching por Periodo de 90 Dias

A API do Google Calendar tem uma limitacao de **90 dias** para consultas de FreeBusy. O metodo `fetchAvailabilityData()` lida com isso automaticamente:

```typescript
private async fetchAvailabilityData(
  calendarIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<EventBusyDate[]>
```

#### Logica de Chunking:

1. **Calculo da Diferenca**: Calcula a diferenca em dias entre `dateFrom` e `dateTo`

2. **Periodo <= 90 dias**: Faz uma unica chamada a API FreeBusy

3. **Periodo > 90 dias**: Divide em chunks de 90 dias e faz multiplas chamadas:
   - Calcula o numero de loops necessarios: `Math.ceil(diff / 90)`
   - Para cada chunk, ajusta `timeMin` e `timeMax`
   - Adiciona 1 minuto entre chunks para evitar sobreposicao
   - Concatena todos os resultados em um unico array

### Exemplo de Chunking

Para um periodo de 200 dias:
- **Chunk 1**: Dias 1-90
- **Chunk 2**: Dias 90-180
- **Chunk 3**: Dias 180-200

## Metodos Auxiliares

### `getFreeBusyData()`

Faz a chamada real a API FreeBusy do Google e transforma a resposta:

```typescript
async getFreeBusyData(args: FreeBusyArgs): Promise<(EventBusyDate & { id: string })[] | null>
```

### `convertFreeBusyToEventBusyDates()`

Converte a resposta da API FreeBusy para o formato `EventBusyDate[]`:

```typescript
private convertFreeBusyToEventBusyDates(
  freeBusyResult: calendar_v3.Schema$FreeBusyResponse
): EventBusyDate[]
```

### `getAvailabilityWithTimeZones()`

Versao alternativa que inclui informacoes de timezone nos resultados:

```typescript
async getAvailabilityWithTimeZones(
  dateFrom: string,
  dateTo: string,
  selectedCalendars: IntegrationCalendar[],
  fallbackToPrimary?: boolean
): Promise<{ start: Date | string; end: Date | string; timeZone: string }[]>
```

## Estrutura de Dados

### FreeBusyArgs

```typescript
type FreeBusyArgs = {
  timeMin: string;
  timeMax: string;
  items: { id: string }[];
};
```

### EventBusyDate

```typescript
type EventBusyDate = {
  start: string;
  end: string;
};
```

## Consideracoes de Performance

1. **Calculo de Datas Nativo**: Usa `Date` nativo ao inves de bibliotecas como `dayjs` para melhor performance

2. **Paginacao de Calendarios**: O metodo `getAllCalendars()` usa paginacao com `maxResults: 250` (maximo permitido pela API)

3. **Chamadas Paralelas**: Cada chunk de 90 dias e processado sequencialmente para evitar rate limiting

## Tratamento de Erros

- Erros sao logados com contexto completo usando `safeStringify`
- Excecoes sao propagadas para o chamador para tratamento adequado
- Se a API retorna `null`, uma excecao e lancada com mensagem descritiva

## Integracao com Delegation Credentials

O servico suporta delegation credentials atraves do campo `delegationCredentialId` nos calendarios selecionados. Isso permite que administradores de dominio acessem calendarios de outros usuarios na organizacao.

A autenticacao e gerenciada pela classe `CalendarAuth`, que lida com tokens OAuth e refresh automatico.
