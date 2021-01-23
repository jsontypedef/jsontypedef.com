using System;
using System.Text.Json.Serialization;

namespace Contoso.Example
{
    public class User
    {
        [JsonPropertyName("createdAt")]
        public DateTimeOffset CreatedAt { get; set; }

        [JsonPropertyName("id")]
        public string Id { get; set; }

        [JsonPropertyName("isAdmin")]
        public bool IsAdmin { get; set; }

        [JsonPropertyName("karma")]
        public int Karma { get; set; }
    }
}
