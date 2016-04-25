# GraphQL Union Input Type
Union Input Type for GraphQL-js

##Why
I wanted to represent a group of an arbitrary number of related, but different items and be able to work with it through graphql. When I started to write mutations, I realised, that Interfaces and Unions are not allowed. I'm not the only one - discussion goes [here](https://github.com/facebook/graphql/issues/114) and [here](https://github.com/graphql/graphql-js/issues/207) for example. There is a chance, that something like this will be added to the core, but it is not certain. I decided to write my own implementation.

##Installation
```
npm install graphql-union-input-type
```
##Usage
```
var UnionInputType = require('graphql-union-input-type');

UnionInputType(options);
```
###Parameters
####Options(object)
 - `name`(string)
 Name for the UnionType itself. It has to be unique in your schema and it can be used to mutate a union nested inside of another union.
 - `inputTypes`(array|object):
   - either array of `GraphQLInputObjectType` objects. Their `name` property will be referenced in mutations.
   - or object with `name:GraphQLInputObjectType` pairs. This `name` will be used instead.

   Objects returned by `UnionInputType` may also be used. This argument will be ignored if `resolveType` function is provided.
 - `typeKey`: a key in a mutation argument object containing the `name` of a type to validate against. If omitted, another [strategy](/#user-content-now-you-can-call-mutations-on-it) will be used instead.
 - `resolveType`(`function(name)` -> `GraphQLInputObjectType`): takes a name found in mutation argument and returns corresponding
`GraphQLInputObjectType` or an object returned by `UnionInputType`. This strategy is not restricted by a predefined set of InputTypes. It behaves as an interface in that `UnionInputType` does not know what InputTypes implement it. If omitted, `inputTypes` is used.

###Examples
####Create normal input types
```js
var JediInputType = new GraphQLInputObjectType({
	name: 'jedi',
	fields: function() {
		return {
			side: {
				type: GraphQLString
			},
			name: {
				type: GraphQLString
			},
		}
	}
});

var SithInputType = new GraphQLInputObjectType({
	name: 'sith',
	fields: function() {
		return {
			side: {
				type: GraphQLString
			},
			name: {
				type: GraphQLString
			},
			doubleBlade: {
				type: GraphQLBoolean
			}
		};
	}
});
```
####Combine them together
```js
var HeroInputType = UnionInputType({
	name: 'hero',
	inputTypes: [JediInputType, SithInputType], //an object can be used instead to query by names other than defined in these types
	typeKey: 'kind'
});
```
OR
```js
var HeroInputType = UnionInputType({
	name: 'hero',
	resolveType: function resolveType(name) {
		if (name === 'jedi') {
			return JediInputType;
		} else {
			return SithInputType;
		}
	},
	typeKey: 'kind'
});
```
####Create schema
```js
var MutationType = new GraphQLObjectType({
	name: 'mutation',
	fields: function() {
		return {
			hero: {
				type: GraphQLBoolean, //this is output type, normally it will correspond to some HeroType of type GraphQLUnionType or GraphQLInterfaceType
				args: {
					input: {
						type: HeroInputType //here is our Union
					}
				},
				resolve: function(root, args) {
					return true;
				}
			}
		};
	}
});

var schema = new GraphQLSchema({
	query: someQueryType,
	mutation: MutationType
});
```
####Now you can call mutations on it
```js
var query = `mutation {
	hero(input: {{kind: "sith", name: "Maul", saberColor: "red", doubleBlade: true})
}`;

graphql(schema, query).then(function(res) {
	expect(res.data).toBeDefined();
	done();
});

query = `mutation {
	hero(input: {{kind: "jedi", name: "Maul", saberColor: "red", doubleBlade: true})
}`;

graphql(schema, query).then(function(res) {
	expect(res.errors).toBeDefined();
	done();
});
```
The second query will fail to validate, as there is no `doubleBlade` field on `jedi` type. Of course you can also set the type of your mutation field to something other than `GraphQLBoolean` and specify the desired return schema.
You can also omit `typeKey` property and write the same mutation this way:
```js
var query = `mutation {
	hero(input: {_type_: "sith", _value_: {name: "Maul", saberColor: "red", doubleBlade: true}})
}`;
```
Your `resolve` function for mutation arguments will get this `input` argument as is.
###Capabilities
You can use these unions as mutation arguments, nest them inside any input types and even create unions of unions. The only small problem is that objects returned by `UnionInputType` are really `GraphQLScalarType`, so I had to allow scalars to be passed to the function.
###Tests
Test are written for `jasmine`. I use `nodemon` to run them. You can find more examples in the spec file. The last test is not written formally, I just used it to play around with nested structures.
###Contributing
Feel free to make suggestions or pull requests.
###License
(The MIT License)
Copyright (c) 2016 Sergei Petrov