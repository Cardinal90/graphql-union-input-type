const {
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLString,
  coerceInputValue,
  valueFromAST,
  GraphQLError
} = require('graphql')

function createDefaultInputObjectType(name, type) {
  if (type instanceof GraphQLInputObjectType || type instanceof GraphQLScalarType) {
    return new GraphQLInputObjectType({ name, fields: () => ({
        _type_: { type: GraphQLString },
        _value_: { type }
      })
    })
  } else {
    throw new GraphQLError(name + '(UnionInputType): all inputTypes must be of GraphQLInputObjectType or GraphQLScalarType(created by UnionInputType function)')
  }
}


/**
 * UnionInputType - Union Input Type for GraphQL
 *
 * @param {string} options.name Name for the union type. Must be unique in your schema. Has to be used in queries to nested unions.
 * @param {array|object|undefined} options.inputTypes Either array of GraphQLInputObjectType objects or UnionInputTypes (which are Scalars really) or object with {name:GraphQLInputObjectType} pairs. Will be ignored if resolveType is provided.
 * @param {string|undefined} options.typeKey If provided, is used as a key containing the type name. If not, the query argument must contain _type_ and _value_ parameters in this particular order.
 * @param {function|undefined} options.resolveType If provided, is called with a key name and must return corresponding GraphQLInputObjectType or null.
 * @param {function|undefined} options.resolveTypeFromAst If provided, is called with full AST for the input argument and must return corresponding GraphQLInputObjectType or null.
 * @param {function|undefined} options.resolveTypeFromValue If provided, is called with a variable value and must return corresponding GraphQLInputObjectType or null.
 * @return {any} 	returns validated and parsed value
 */
module.exports = function UnionInputType(options) {
  const { name, typeKey, resolveType, resolveTypeFromAst, resolveTypeFromValue } = options
  let { inputTypes } = options

  if (!resolveType && !resolveTypeFromAst) {
    // if inputType is array, convert to object associating with the "name" key
    if (Array.isArray(inputTypes)) {
      inputTypes = inputTypes.reduce((acc, refType) => ({ ...acc, [refType.name]: refType }), {});
    }

    if (inputTypes && typeof inputTypes === 'object') {
      inputTypes = Object.fromEntries(
        Object.entries(inputTypes)
          .map(([key, type]) => [key, typeKey ? type : createDefaultInputObjectType(key, type)])
      )
    }
  }

  return new GraphQLScalarType({
    name,

    serialize: (value) => value,

    parseValue(value) {
      function resolveTypeFromKey() {
        if (typeof resolveTypeFromValue === 'function') {
          return resolveTypeFromValue(value)
        }

        if (typeKey) {
          if (value[typeKey]) {
            return value[typeKey]
          } else {
            throw new GraphQLError(name + '(UnionInputType): Expected an object with "' + typeKey + '" property');
          }
        } else if (value._type_ && value._value_) {
          return value._type_
        } else {
          throw new GraphQLError(name + '(UnionInputType): Expected an object with _type_ and _value_ properties in this order')
        }
      }

      const type = resolveTypeFromKey()
      const inputType = typeof resolveType === 'function'
        ? typeKey
          ? createDefaultInputObjectType(type, resolveType(type))
          : resolveType(type)
        : inputTypes[type]

      const { errors } = coerceInputValue(value, inputType);
      if (errors) throw new GraphQLError(errors.map(e => "\n" + e.message).join(''))
      return value
    },

    parseLiteral(ast) {
      let type, inputType;
      if (typeof resolveTypeFromAst === 'function') {
        inputType = resolveTypeFromAst(ast);
      } else {
        if (typeKey) {
          type = ast.fields.find(field => field.name.value === typeKey)
          if (!type) throw new GraphQLError(name + '(UnionInputType): Expected an object with "' + typeKey + '" property')
        } else if (ast.fields[0].name.value === '_type_' && ast.fields[1].name.value === '_value_'){
          type = ast.fields[0].value.value
        } else {
          throw new GraphQLError(name + '(UnionInputType): Expected an object with _type_ and _value_ properties in this order');
        }

        if (typeof resolveType === 'function') {
          inputType = resolveType(type);
          if (!typeKey) {
            inputType = createDefaultInputObjectType(type, inputType);
          }
        } else {
          inputType = inputTypes[type];
        }
      }

      const value = valueFromAST(ast, inputType)
      if (value == null) throw new GraphQLError('expected type ' + type + ', found ' + ast.loc.source.body.substring(ast.loc.start, ast.loc.end))
      return value
    }
  });
};
