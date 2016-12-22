# GraphQL Union Input Type
Union Input Type for GraphQL-js

##Why
I wanted to represent a group of an arbitrary number of related, but different items and be able to work with it through graphql. When I started to write mutations, I realised, that Interfaces and Unions are not allowed. I'm not the only one - discussion goes [here](https://github.com/facebook/graphql/issues/114) and [here](https://github.com/graphql/graphql-js/issues/207) for example. There is a chance, that something like this will be added to the core, but it is not certain.

It would be nice to have some syntax support to specify the type to be validated against. Otherwise the only way to have clean queries without some workarounds is to let developers manually traverse AST, which seems like a too low level detail to expose.

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
 - `name`(`string`)
 Name for the UnionType itself. It has to be unique in your schema and it can be used to mutate a union nested inside of another union.
 - `inputTypes`(`array|object`):
   - either array of `GraphQLInputObjectType` objects. Their `name` property will be referenced in mutations.
   - or object with `name:GraphQLInputObjectType` pairs. This `name` will be used instead.

   Objects returned by `UnionInputType` may also be used. This argument will be ignored if `resolveType` function is provided.
 - `typeKey`(`string)`: a key in a mutation argument object containing the `name` of a type to validate against. If omitted, another [strategy](#now-you-can-call-mutations-on-it) will be used instead.
 - `resolveType`(`function(name)` -> `GraphQLInputObjectType|null`): takes a name found in mutation argument and returns corresponding
`GraphQLInputObjectType` or an object returned by `UnionInputType`. This strategy is not restricted by a predefined set of input types. It behaves as an interface in that `UnionInputType` does not know what input types implement it. If omitted, `inputTypes` is used.
 - `resolveTypeFromAst`(`function(ast)` -> `GraphQLInputObjectType|null`): provide this, if you absolutely do not want to explicitly specify the type in you mutation. The function will be called with full AST, which you can traverse manually to identify the input type and return it.

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
	typeKey: 'side' //optional
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
	typeKey: 'side' //optional
});
```
OR
```js
var HeroInputType = UnionInputType({
	name: 'hero',
	resolveTypeFromAst: resolveTypeFromAst(ast) {
		if (ast.fields[2] && ast.fields[2].name.value === 'doubleBlade') {
			return SithInputType;
		} else {
			return JediInputType;
		}
	}
});
```
Note, that in the last case as it is written `doubleBlade` field on `SithInputType` needs to be wrapped with `GraphQLNonNull` for the result to be accurate. Also you could loop through `ast.fields` instead of checking just position 2. For more information just dump AST into console and see what it contains.
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

Finally if you provided `resolveTypeFromAst` function, you may query with an input argument as it is:
```js
var query = `mutation {
	hero(input: {name: "Maul", saberColor: "red", doubleBlade: true})
}`;
```
###Capabilities
You can use these unions as mutation arguments, nest them inside any input types and even create unions of unions. The only small problem is that objects returned by `UnionInputType` are really `GraphQLScalarType`, so I had to allow scalars to be passed to the function.

Update: [this issue](https://github.com/Cardinal90/graphql-union-input-type/issues/2) highlighted a serious limitation - it is not possible to provide type as a variable.

###Tests
Test are written for `jasmine`. I use `nodemon` to run them. You can find more examples in the spec file. The last test is not written formally, I just used it to play around with nested structures.

###Contributing
Feel free to make suggestions or pull requests.

###License
(The MIT License)

Copyright (c) 2016 Sergei Petrov
