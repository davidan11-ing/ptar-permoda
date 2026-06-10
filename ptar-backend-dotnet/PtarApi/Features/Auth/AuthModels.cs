using System.Text.Json.Serialization;

namespace PtarApi.Features.Auth;

public record LoginRequest(
    [property: JsonPropertyName("email")]    string Email,
    [property: JsonPropertyName("password")] string Password);

public record LoginResponse(
    [property: JsonPropertyName("id")]           string Id,
    [property: JsonPropertyName("email")]        string Email,
    [property: JsonPropertyName("nombre")]       string Nombre,
    [property: JsonPropertyName("role")]         string Role,
    [property: JsonPropertyName("access_token")] string AccessToken,
    [property: JsonPropertyName("token_type")]   string TokenType = "bearer");

public record MeResponse(
    [property: JsonPropertyName("id")]     string Id,
    [property: JsonPropertyName("email")]  string Email,
    [property: JsonPropertyName("nombre")] string Nombre,
    [property: JsonPropertyName("role")]   string Role);
