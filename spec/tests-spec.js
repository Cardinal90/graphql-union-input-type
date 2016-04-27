"use strict";

var graphql = require('graphql').graphql;
var GraphQLSchema = require('graphql').GraphQLSchema;
var GraphQLObjectType = require('graphql').GraphQLObjectType;
var GraphQLInputObjectType = require('graphql').GraphQLInputObjectType;
var GraphQLList = require('graphql').GraphQLList;
var GraphQLString = require('graphql').GraphQLString;
var GraphQLInt = require('graphql').GraphQLInt;
var GraphQLNonNull = require('graphql').GraphQLNonNull;
var GraphQLBoolean = require('graphql').GraphQLBoolean;

var UnionInputType = require('../index.js');

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
			saberColor: {
				type: GraphQLString
			}
		};
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
			saberColor: {
				type: GraphQLString
			},
			doubleBlade: {
				type: GraphQLBoolean
			}
		};
	}
});


function generateSchema(options) {
	var HeroInputType = UnionInputType(options);

	var MutationType = new GraphQLObjectType({
		name: 'mutation',
		fields: function() {
			return {
				hero: {
					type: GraphQLBoolean,
					args: {
						input: {
							type: HeroInputType
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
		query: (new GraphQLObjectType({
			name: 'query',
			fields: {
				id: {
					type: GraphQLInt
				}
			}
		})),
		mutation: MutationType
	});

	return schema;
}


describe('_type_/_value_ query format:', function() {

	var schema = generateSchema({
		name: 'heroUnion',
		inputTypes: [JediInputType, SithInputType]
	});

	describe('Throws on incorrect query format', function() {
		it('Expects both _type_ and _value_ parameters', function(done) {
			var query = `
			mutation {
				hero(input: {_value_: {name: "Maul", saberColor: "red", doubleBlade: true}})
			}
			`;

			graphql(schema, query).then(function(res) {
				// console.log(res);
				expect(res.errors).toBeDefined();
				done();
			});
		});

		it('Expects parameters in correct order', function(done) {
			var query = `
			mutation {
				hero(input: {_value_: {name: "Maul", saberColor: "red", doubleBlade: true}, _type_: "sith"})
			}
			`;

			graphql(schema, query).then(function(res) {
				// console.log(res);
				expect(res.errors).toBeDefined();
				done();
			});
		});
	})

	describe('Predefined input types:', function() {
		var schema = generateSchema({
			name: 'heroUnion',
			inputTypes: [JediInputType, SithInputType]
		});

		describe('Correctly validates against the type requested in the mutation:', function() {

			it('Validates Maul as a sith', function(done) {
				var query = `
				mutation {
					hero(input: {_type_: "sith", _value_: {name: "Maul", saberColor: "red", doubleBlade: true}})
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.data).toBeDefined();
					done();
				});
			});

			it('Throws, when trying to assign that doubleBlade to a jedi', function(done) {
				var query = `
				mutation {
					hero(input: {_type_: "jedi", _value_: {name: "Maul", saberColor: "red", doubleBlade: true}})
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.errors).toBeDefined();
					done();
				});
			});

		});

	});

	describe('Function to resolve types at runtime:', function() {

		function resolveType(type) {
			if (type === 'jedi') {
				return JediInputType;
			} else {
				return SithInputType;
			}
		}
		var schema = generateSchema({
			name: 'heroUnion',
			resolveType: resolveType
		});

		describe('Correctly validates against the type requested in the mutation:', function() {

			it('Validates Maul as a sith', function(done) {
				var query = `
				mutation {
					hero(input: {_type_: "sith", _value_: {name: "Maul", saberColor: "red", doubleBlade: true}})
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.data).toBeDefined();
					done();
				});
			});

			it('Throws, when trying to assign that doubleBlade to a jedi', function(done) {
				var query = `
				mutation {
					hero(input: {_type_: "jedi", _value_: {name: "Maul", saberColor: "red", doubleBlade: true}})
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.errors).toBeDefined();
					done();
				});
			});
		});
	});
});


describe('Query format with provided typeKey:', function() {


	var schema = generateSchema({
		name: 'heroUnion',
		inputTypes: [JediInputType, SithInputType],
		typeKey: 'side'
	});

	describe('Throws on incorrect query format', function() {
		it('Expects to find the provided typeKey in object', function(done) {
			var query = `
			mutation {
				hero(input: {name: "Maul", saberColor: "red", doubleBlade: true})
			}
			`;

			graphql(schema, query).then(function(res) {
				// console.log(res);
				expect(res.errors).toBeDefined();
				done();
			});
		});

		it('Does not accept previous format', function(done) {
			var query = `
			mutation {
				hero(input: {_type_: "jedi", _value_: {name: "Maul", saberColor: "red", doubleBlade: true}})
			}
			`;

			graphql(schema, query).then(function(res) {
				// console.log(res);
				expect(res.errors).toBeDefined();
				done();
			});
		});
	});

	describe('Predefined input types (with object format for inputTypes this time)', function() {

		var schema = generateSchema({
			name: 'heroUnion',
			inputTypes: {
				JEDI: JediInputType,
				SITH: SithInputType
			},
			typeKey: 'side'
		});

		describe('Correctly validates against the type requested in the mutation:', function() {

			it('Validates Maul as a sith', function(done) {
				var query = `
				mutation {
					hero(input: {name: "Maul", saberColor: "red", doubleBlade: true, side: "SITH"})
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.data).toBeDefined();
					done();
				});
			});

			it('Throws, when trying to assign that doubleBlade to a jedi', function(done) {
				var query = `
				mutation {
					hero(input: {name: "Maul", saberColor: "red", doubleBlade: true, side: "JEDI"})
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.errors).toBeDefined();
					done();
				});
			});

		});

	});

	describe('Function to resolve types from names at runtime:', function() {

		function resolveType(type) {
			if (type === 'jedi') {
				return JediInputType;
			} else {
				return SithInputType;
			}
		}
		var schema = generateSchema({
			name: 'heroUnion',
			resolveType: resolveType,
			typeKey: 'side'
		});

		describe('Correctly validates against the type requested in the mutation:', function() {

			it('Validates Maul as a sith', function(done) {
				var query = `
				mutation {
					hero(input: {side: "sith", name: "Maul", saberColor: "red", doubleBlade: true})
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.data).toBeDefined();
					done();
				});
			});

			it('Throws, when trying to assign that doubleBlade to a jedi', function(done) {
				var query = `
				mutation {
					hero(input: 5)
				}
				`;

				graphql(schema, query).then(function(res) {
					// console.log(res);
					expect(res.errors).toBeDefined();
					done();
				});
			});
		});
	});
});


describe('Function to resolve types from AST:', function() {

	function resolveTypeFromAst(ast) {
		if (ast.fields[2] && ast.fields[2].name.value === 'doubleBlade') {
			return SithInputType;
		} else {
			return JediInputType;
		}
	}
	var schema = generateSchema({
		name: 'heroUnion',
		resolveTypeFromAst: resolveTypeFromAst
	});

	describe('Correctly validates against the type returned from function:', function() {

		it('Validates Maul as a sith', function(done) {
			var query = `
			mutation {
				hero(input: {name: "Maul", saberColor: "red", doubleBlade: true})
			}
			`;

			graphql(schema, query).then(function(res) {
				// console.log(res);
				expect(res.data).toBeDefined();
				done();
			});
		});
	});
});



describe('A more complex test to play around with to show that nested arguments and unions of unions also work', function() {

	it('', function(done) {

		JediInputType = new GraphQLInputObjectType({
			name: 'jedi',
			fields: function() {
				return {
					side: {
						type: GraphQLString
					},
					name: {
						type: GraphQLString
					},
					saberColor: {
						type: GraphQLString
					},
					friends: {
						type: new GraphQLList(UnionInputType({
							name: 'jediUnion',
							inputTypes: [JediInputType, SithInputType]
						}))
					}
				}
			}
		});

		SithInputType = new GraphQLInputObjectType({
			name: 'sith',
			fields: function() {
				return {
					side: {
						type: GraphQLString
					},
					name: {
						type: GraphQLString
					},
					saberColor: {
						type: GraphQLString
					},
					doubleBlade: {
						type: GraphQLBoolean
					},
					friends: {
						type: new GraphQLNonNull(UnionInputType({
							name: 'sithUnion',
							inputTypes: [UnionInputType({
								name: 'qqq',
								inputTypes: [JediInputType]
							}), UnionInputType({
								name: 'www',
								inputTypes: [JediInputType]
							})]
						}))
					}
				}
			}
		});

		var schema = generateSchema({
			name: 'heroUnion',
			inputTypes: [JediInputType, SithInputType]
		});

		var query = `
		mutation {
			hero(input:
				{
					_type_: "jedi",
					_value_: {
						name: "Qui-Gon",
						saberColor: "green",
						friends: [
							{
								_type_: "jedi",
								_value_:{name: "anakin"}
							},
							{
								_type_: "sith",
								_value_:{
									name: "anakin",
									doubleBlade: true,
									friends :{
										_type_ :"qqq",
										_value_: {
											_type_: "jedi",
											_value_: {
												name: "Yoda"
											}
										}
									}
								}
							}
						]
					}
				})
		}
		`;

		var query2 = `
		mutation {
			hero(input: {_type_: "jedi", _value_: {name: "Maul", saberColor: "red", friends: [{_type_: "jedi", _value_:{name: "anakin"}}, {_type_: "jedi", _value_:{name: "anakin", doubleBlade: true}}]}})
		}
		`;

		var query3 = `
		mutation {
			hero(input: {_type_: "sith", _value_: {name: "Maul", saberColor: "red"}})
		}
		`;

		graphql(schema, query).then(function(res) {
				// console.log(res);
				expect(res.data).toBeDefined();
			})
			.then(function() {
				graphql(schema, query2).then(function(res) {
						// console.log(res);
						expect(res.errors).toBeDefined();
					})
					.then(function() {
						graphql(schema, query3).then(function(res) {
							// console.log(res);
							expect(res.errors).toBeDefined();
							done();
						});
					});
			});
	});
});




// var JediType = new GraphQLObjectType({
// 	name: 'jedi',
// 	fields: function() {
// 		return {
// 			side: {
// 				type: GraphQLString
// 			},
// 			name: {
// 				type: GraphQLString
// 			},
// 			saberColor: {
// 				type: GraphQLString
// 			}
// 		}
// 	}
// });
//
// var SithType = new GraphQLObjectType({
// 	name: 'sith',
// 	fields: function() {
// 		return {
// 			side: {
// 				type: GraphQLString
// 			},
// 			name: {
// 				type: GraphQLString
// 			},
// 			saberColor: {
// 				type: GraphQLString
// 			},
// 			doubleBlade: {
// 				type: GraphQLBoolean
// 			}
// 		}
// 	}
// });
//
// var HeroType = new GraphQLUnionType({
// 	name: 'hero',
// 	types: [SithType, JediType],
// 	resolveType: function(hero) {
// 		if (hero.side == 'jedi') {
// 			return JediType;
// 		} else {
// 			return SithType;
// 		}
// 	}
// });
//
// var QueryType = new GraphQLObjectType({
// 	name: 'query',
// 	fields: function() {
// 		return {
// 			hero: {
// 				type: HeroType,
// 				args: {
// 					id: {
// 						type: GraphQLInt
// 					}
// 				},
// 				resolve: function(root, args) {
//
// 					return heroes[args.id]
// 				}
// 			}
// 		}
// 	}
// });
