// IDEA: explore better displayName functions
function displayName(name) {
  // Pascal case
  return name
    .match(/[a-z]+/gi)
    .map((word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase())
    .join('');
}

function transformRecord(config) {
  const output = {};
  const components = {};

  if (config) {
    Object.entries(config).forEach(([name, registration]) => {
      if (output[name]) {
        throw new Error(`"${name}" has already been declared`);
      }

      const componentName = registration.render ? displayName(name) : undefined;

      output[name] = {
        ...registration,
        render: componentName,
      };

      if (componentName) {
        components[componentName] = registration.render;
      }
    });
  }

  return {output, components};
}

exports.getSchema = function getSchema(schema) {
  const {output: tags, components: tagComponents} = transformRecord(
    schema.tags
  );

  const {output: nodes, components: nodeComponents} = transformRecord(
    schema.nodes
  );

  return {
    ...schema,
    tags,
    nodes,
    components: {
      ...tagComponents,
      ...nodeComponents,
    },
  };
};

exports.defaultObject = function defaultObject(o) {
  if (Object.prototype.hasOwnProperty.call(o, 'default')) return o.default;
  return o || {};
};
