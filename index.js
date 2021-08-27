const {
  GraphQLScalarType,
  GraphQLInputObjectType,
  GraphQLString,
  coerceInputValue,
  valueFromAST,
  GraphQLError
} = require('graphql')

function createDefaultInputObjectType(name, type) {
  return new GraphQLInputObjectType({ name, fields: () => ({
      _type_: { type: GraphQLString },
      _value_: { type }
    })
  })
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
    if (Array.isArray(inputTypes)) {
      inputTypes = inputTypes.reduce(function (acc, refType) {
        if (!(refType instanceof GraphQLInputObjectType || refType instanceof GraphQLScalarType)) {
          throw (new GraphQLError(name + '(UnionInputType): all inputTypes must be of GraphQLInputObjectType or GraphQLScalarType(created by UnionInputType function)'));
        }
        acc[refType.name] = (typeKey ? refType : createDefaultInputObjectType(refType.name, refType));
        return acc;
      }, {});
    } else if (inputTypes !== null && typeof inputTypes === 'object') {
      Object.keys(inputTypes).forEach(function (key) {
        if (!(inputTypes[key] instanceof GraphQLInputObjectType || inputTypes[key] instanceof GraphQLScalarType)) {
          throw (new GraphQLError(name + '(UnionInputType): all inputTypes must be of GraphQLInputObjectType or GraphQLScalarType(created by UnionInputType function'));
        }
        inputTypes[key] = typeKey ? inputTypes[key] : createDefaultInputObjectType(key, inputTypes[key]);
      });
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

      const errors = coerceInputValue(value, inputType).errors;

      if (!errors) {
        return value;
      } else {
        const errorString = errors.map((error) => {
          return "\n" + error.message;
        }).join('');
        throw new GraphQLError(errorString);
      }
    },

    parseLiteral(ast) {
      let type, inputType;
      if (typeof resolveTypeFromAst === 'function') {
        inputType = resolveTypeFromAst(ast);
      } else {
        if (typeKey) {
          try {
            for (let i = 0; i < ast.fields.length; i++) {
              if (ast.fields[i].name.value === typeKey) {
                type = ast.fields[i].value.value;
                break;
              }
            }
            if (!type) {
              throw (new Error);
            }
          } catch (err) {
            throw new GraphQLError(name + '(UnionInputType): Expected an object with "' + typeKey + '" property');
          }
        } else {
          try {
            if (ast.fields[0].name.value === '_type_' && ast.fields[1].name.value === '_value_') {
              type = ast.fields[0].value.value;
            } else {
              throw (new Error);
            }
          } catch (err) {
            throw new GraphQLError(name + '(UnionInputType): Expected an object with _type_ and _value_ properties in this order');
          }
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
      if (value != null) {
        return value;
      } else {
        throw new GraphQLError('expected type ' + type + ', found ' + ast.loc.source.body.substring(ast.loc.start, ast.loc.end));
      }
    }
  });
};
