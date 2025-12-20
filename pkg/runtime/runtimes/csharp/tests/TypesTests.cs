using System.Collections.Generic;
using Xunit;
using Barrister2;

namespace Barrister2.Tests
{
    public class TypesTests
    {
        [Fact]
        public void FindStruct_ReturnsStructDefinition()
        {
            var allStructs = new Dictionary<string, Dictionary<string, object>>
            {
                { "User", new Dictionary<string, object> { { "fields", new List<object>() } } },
                { "Book", new Dictionary<string, object> { { "fields", new List<object>() } } }
            };
            var result = Types.FindStruct("User", allStructs);
            Assert.NotNull(result);
            Assert.True(result!.ContainsKey("fields"));

            result = Types.FindStruct("Book", allStructs);
            Assert.NotNull(result);
            Assert.True(result!.ContainsKey("fields"));

            result = Types.FindStruct("NotFound", allStructs);
            Assert.Null(result);
        }

        [Fact]
        public void FindEnum_ReturnsEnumDefinition()
        {
            var allEnums = new Dictionary<string, Dictionary<string, object>>
            {
                { "Platform", new Dictionary<string, object> { { "values", new List<object>() } } }
            };
            var result = Types.FindEnum("Platform", allEnums);
            Assert.NotNull(result);
            Assert.True(result!.ContainsKey("values"));

            result = Types.FindEnum("NotFound", allEnums);
            Assert.Null(result);
        }

        [Fact]
        public void GetStructFields_SimpleStruct()
        {
            var allStructs = new Dictionary<string, Dictionary<string, object>>
            {
                {
                    "User",
                    new Dictionary<string, object>
                    {
                        {
                            "fields",
                            new List<Dictionary<string, object>>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "id" },
                                    { "type", new Dictionary<string, object> { { "builtIn", "string" } } }
                                },
                                new Dictionary<string, object>
                                {
                                    { "name", "name" },
                                    { "type", new Dictionary<string, object> { { "builtIn", "string" } } }
                                }
                            }
                        }
                    }
                }
            };
            var fields = Types.GetStructFields("User", allStructs);
            Assert.Equal(2, fields.Count);
            Assert.Equal("id", fields[0]["name"].ToString());
            Assert.Equal("name", fields[1]["name"].ToString());
        }

        [Fact]
        public void GetStructFields_WithExtends()
        {
            var allStructs = new Dictionary<string, Dictionary<string, object>>
            {
                {
                    "Base",
                    new Dictionary<string, object>
                    {
                        {
                            "fields",
                            new List<Dictionary<string, object>>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "id" },
                                    { "type", new Dictionary<string, object> { { "builtIn", "string" } } }
                                }
                            }
                        }
                    }
                },
                {
                    "User",
                    new Dictionary<string, object>
                    {
                        { "extends", "Base" },
                        {
                            "fields",
                            new List<Dictionary<string, object>>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "name" },
                                    { "type", new Dictionary<string, object> { { "builtIn", "string" } } }
                                }
                            }
                        }
                    }
                }
            };
            var fields = Types.GetStructFields("User", allStructs);
            Assert.Equal(2, fields.Count);
            Assert.Equal("id", fields[0]["name"].ToString()); // Parent field first
            Assert.Equal("name", fields[1]["name"].ToString()); // Child field second
        }

        [Fact]
        public void GetStructFields_OverrideParent()
        {
            var allStructs = new Dictionary<string, Dictionary<string, object>>
            {
                {
                    "Base",
                    new Dictionary<string, object>
                    {
                        {
                            "fields",
                            new List<Dictionary<string, object>>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "id" },
                                    { "type", new Dictionary<string, object> { { "builtIn", "string" } } }
                                }
                            }
                        }
                    }
                },
                {
                    "User",
                    new Dictionary<string, object>
                    {
                        { "extends", "Base" },
                        {
                            "fields",
                            new List<Dictionary<string, object>>
                            {
                                new Dictionary<string, object>
                                {
                                    { "name", "id" },
                                    { "type", new Dictionary<string, object> { { "builtIn", "int" } } } // Override parent
                                },
                                new Dictionary<string, object>
                                {
                                    { "name", "name" },
                                    { "type", new Dictionary<string, object> { { "builtIn", "string" } } }
                                }
                            }
                        }
                    }
                }
            };
            var fields = Types.GetStructFields("User", allStructs);
            Assert.Equal(2, fields.Count);
            // Child field should override parent
            var idFieldType = fields[0]["type"] as Dictionary<string, object>;
            Assert.NotNull(idFieldType);
            Assert.Equal("int", idFieldType!["builtIn"].ToString());
            Assert.Equal("name", fields[1]["name"].ToString());
        }
    }
}

