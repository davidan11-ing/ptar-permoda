using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace PtarApi.Features.Auth;

public record LoginRequest(
    [property: JsonPropertyName("email")]    [Required, EmailAddress, MaxLength(254)] string Email,
    [property: JsonPropertyName("password")] [Required, MinLength(6), MaxLength(128)] string Password);

public record LoginResponse(
    [property: JsonPropertyName("id")]     string Id,
    [property: JsonPropertyName("email")]  string Email,
    [property: JsonPropertyName("nombre")] string Nombre,
    [property: JsonPropertyName("role")]   string Role);

public record MeResponse(
    [property: JsonPropertyName("id")]     string Id,
    [property: JsonPropertyName("email")]  string Email,
    [property: JsonPropertyName("nombre")] string Nombre,
    [property: JsonPropertyName("role")]   string Role);

public record ChangePasswordRequest(
    [property: JsonPropertyName("current_password")] [Required, MinLength(6), MaxLength(128)] string CurrentPassword,
    [property: JsonPropertyName("new_password")]     [Required, MinLength(8), MaxLength(128)] string NewPassword);
