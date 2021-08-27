import {
  graphql,
  GraphQLBoolean,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from "graphql";
import UnionInputType, {UnionInputTypeArgs} from "../src";

const JediInputType = new GraphQLInputObjectType({
  name: 'Jedi',
  fields: () => ({
    side: { type: GraphQLString },
    name: { type: GraphQLString },
    saberColor: { type: GraphQLString }
  })
})

const SithInputType = new GraphQLInputObjectType({
  name: 'Sith',
  fields: () => ({
    side: { type: GraphQLString },
    name: { type: GraphQLString },
    saberColor: { type: GraphQLString },
    doubleBlade: { type: GraphQLBoolean }
  })
})

function generateSchema(options: UnionInputTypeArgs) {
  const HeroInputType = UnionInputType(options)

  const query = new GraphQLObjectType({
      name: 'Query',
      fields: { id: { type: GraphQLInt } }
  })

  const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({
      hero: {
        type: GraphQLBoolean,
        args: {
          input: {
            type: HeroInputType
          }
        },
        resolve: () => true
      }
    })
  })

  return new GraphQLSchema({ query, mutation })
}

test('Happy Way', async () => {
  const result = await graphql(
    generateSchema({ name: 'HeroUnion', inputTypes: [JediInputType, SithInputType], typeKey: '__t' }),
    `mutation { hero(input: { __t: "Sith", name: "Maul", saberColor: "red", doubleBlade: true }) }`
  )

  expect(result.data).toBeDefined()
  expect(result.errors).toBeUndefined()
})
