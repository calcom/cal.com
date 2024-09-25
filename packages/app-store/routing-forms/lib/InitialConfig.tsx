import QueryBuilderInitialConfig, {BasicConfig} from "../components/react-awesome-query-builder/config/config";

export const InitialConfig = QueryBuilderInitialConfig;
export const AttributesInitialConfig = {
  ...InitialConfig,
  funcs: {
    ...BasicConfig.funcs,
    LOWER: {
      label: 'Lowercase',
      mongoFunc: '$toLower',
      jsonLogic: '!!',
      returnType: 'text',
      args: {
        str: {
          label: 'String',
          type: 'text',
          valueSources: ['value', 'field'],
        },
      },
    },
    UPPER: {
      label: 'Uppercase',
      mongoFunc: '$toUpper',
      jsonLogic: '!!',
      returnType: 'text',
      args: {
        str: {
          label: 'String',
          type: 'text',
          valueSources: ['value', 'field'],
        },
      },
    },
  },
  operators: {
    ...BasicConfig.operators,
  },
};

