namespace flish.Configuration;

public sealed class BasicAuthOptions
{
    public const string SectionName = "BasicAuth";

    public SeedUserOptions SeedUser { get; set; } = new();

    public sealed class SeedUserOptions
    {
        public string Username { get; set; } = "admin";
        public string Password { get; set; } = "ChangeMe123!";
    }
}

