import {
  coerceInputValue,
  GraphQLError,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLScalarType,
  ObjectValueNode,
  Kind, StringValueNode, valueFromAST
} from "graphql";

export type UnionInputTypeArgs = {
  name: string
  typeKey: string
  description?: string | undefined
  inputTypes: GraphQLInputObjectType[] | { [name: string]: GraphQLInputType }
}

export default function UnionInputType({ name, typeKey, description, inputTypes: _inputTypes }: UnionInputTypeArgs) {

  const inputTypes: { [name: string]: GraphQLInputType } = Array.isArray(_inputTypes)
    ? _inputTypes.reduce((acc, curr) => ({ ...acc, [curr.name]: curr }), {})
    : _inputTypes

  return new GraphQLScalarType({
    name, description, serialize: value => value,

    parseValue(value) {
      console.log(value)
      const actualType = value[typeKey]
      if (!actualType) throw new GraphQLError(`${name} (UnionInputType): Expected an object with ${typeKey} property`);

      const expectedType = inputTypes[actualType]

      const { errors } = coerceInputValue(value, expectedType);
      if (errors) throw new GraphQLError(errors.map((e: any) => "\n" + e.message).join(''))
      return value
    },

    parseLiteral(ast) {
      if (!ast || ast.kind !== Kind.OBJECT) {
        throw new GraphQLError(`${name} (UnionInputType): Expected an object with ${typeKey} property`)
      }

      const typeNameNode = (ast as ObjectValueNode).fields.find(field => field.name.value === typeKey)
      if (!typeNameNode || typeNameNode.value.kind !== Kind.STRING) {
        throw new GraphQLError(`${name} (UnionInputType): Expected an object with ${typeKey} property`)
      }

      const type = inputTypes[(typeNameNode.value as StringValueNode).value]
      if (!type) {
        throw new GraphQLError(`${name} (UnionInputType): ${typeNameNode.value.value} is not a valid type. Expected ` + Object.keys(inputTypes))
      }

      const value = valueFromAST(ast, type)
      if (value == null) throw new GraphQLError(`${name} (UnionInputType): Expected type ${type}, found ${ast.loc.source.body.substring(ast.loc.start, ast.loc.end)}`)
      return value
    }
  })
}
