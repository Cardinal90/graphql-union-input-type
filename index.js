var GraphQLScalarType = require('graphql').GraphQLScalarType;
var GraphQLInputObjectType = require('graphql').GraphQLInputObjectType;
var GraphQLString = require('graphql').GraphQLString;

var isValidLiteralValue = require('graphql/utilities').isValidLiteralValue;
var valueFromAST = require('graphql/utilities').valueFromAST;

var GraphQLError = require('graphql/error').GraphQLError;

function helper(name, type) {
	"use strict";
	return (new GraphQLInputObjectType({
		name: name,
		fields: function() {
			return {
				_type_: {
					type: GraphQLString
				},
				_value_: {
					type: type
				}
			};
		}
	}));
}


/**
 * UnionInputType - Union Input Type for GraphQL
 *
 * @param  {object} options see below
 * @return {any} 	returns validated and parsed value
 */
module.exports = function UnionInputType(options) {
	"use strict";

	/**
	 * 	@param  {array} options.name					Name for the union type. Must be unique in your schema. Has to be used in queries to nested unions.
	 */
	var name = options.name;

	/**
	 * 	@param  {array|object} options.inputTypes 		Optional. Either array of GraphQLInputObjectType objects or UnionInputTypes (which are Scalars really)
	 * 	                                              	or object with {name:GraphQLInputObjectType} pairs.
	 * 	                                             	Will be ignored if resolveType is provided.
	 */
	var referenceTypes = options.inputTypes;

	/**
	 * 	 @param  {string} options.typeKey				Optional. If provided, is used as a key containing the type name. If not, the query argument must
	 * 	                                      			contain _type_ and _value_ parameteres in this particular order
	 */
	var typeKey = options.typeKey;


	/**
	 * 	 @param  {function} options.resolveType			Optional. If provided, is called with a key name and must return corresponding GraphQLInputObjectType or null
	 */
	var resolveType = options.resolveType;

	/**
	 * 	 @param  {function} options.resolveType			Optional. If provided, is called with full AST for the input argument and must return
	 * 	                                          		corresponding GraphQLInputObjectType or null
	 */
	var resolveTypeFromAst = options.resolveTypeFromAst;

	if (!resolveType && !resolveTypeFromAst) {
		if (Array.isArray(referenceTypes)) {
			referenceTypes = referenceTypes.reduce(function(acc, refType) {
				if (!(refType instanceof GraphQLInputObjectType || refType instanceof GraphQLScalarType)) {
					throw (new GraphQLError(name + '(UnionInputType): all inputTypes must be of GraphQLInputObjectType or GraphQLScalarType(created by UnionInputType function)'));
				}
				acc[refType.name] = (typeKey ? refType : helper(refType.name, refType));
				return acc;
			}, {});
		} else if (referenceTypes !== null && typeof referenceTypes === 'object') {
			Object.keys(referenceTypes).forEach(function(key) {
				if (!(referenceTypes[key] instanceof GraphQLInputObjectType || referenceTypes[key] instanceof GraphQLScalarType)) {
					throw (new GraphQLError(name + '(UnionInputType): all inputTypes must be of GraphQLInputObjectType or GraphQLScalarType(created by UnionInputType function'));
				}
				referenceTypes[key] = typeKey ? referenceTypes[key] : helper(key, referenceTypes[key]);
			});
		}
	}

	var union = (new GraphQLScalarType({
		name: name,
		serialize: function(value) {
			return value;
		},
		parseValue: function(value) {
			return value;
		},
		parseLiteral: function(ast) {
			var type, inputType;
			if (typeof resolveTypeFromAst === 'function') {
				inputType = resolveTypeFromAst(ast);
			} else {
				if (typeKey) {
					try {
						for (var i = 0; i < ast.fields.length; i++) {
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
						inputType = helper(type, inputType);
					}
				} else {
					inputType = referenceTypes[type];
				}
			}
			if (isValidLiteralValue(inputType, ast).length == 0) {
				return valueFromAST(ast, inputType);
			} else {
				throw new GraphQLError('expected type ' + type + ', found ' + ast.loc.source.body.substring(ast.loc.start, ast.loc.end));
			}
		}
	}));

	return union;
};
