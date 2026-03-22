using flish.Features.Indexing;
using Xunit;

namespace flish.Tests;

public class ShortCodeTests
{
    private static readonly HashSet<char> ValidAlphabet =
        new("ABCDEFGHJKLMNPQRSTUVWXYZ23456789");

    [Fact]
    public void GenerateShortCode_Returns6Characters()
    {
        var code = FileIndexer.GenerateShortCode();
        Assert.Equal(6, code.Length);
    }

    [Fact]
    public void GenerateShortCode_UsesOnlyValidAlphabet()
    {
        for (var i = 0; i < 100; i++)
        {
            var code = FileIndexer.GenerateShortCode();
            foreach (var c in code)
            {
                Assert.Contains(c, ValidAlphabet);
            }
        }
    }

    [Fact]
    public void GenerateShortCode_ExcludesAmbiguousCharacters()
    {
        var ambiguous = new HashSet<char> { 'O', '0', 'I', '1', 'L' };
        for (var i = 0; i < 200; i++)
        {
            var code = FileIndexer.GenerateShortCode();
            foreach (var c in code)
            {
                Assert.DoesNotContain(c, ambiguous);
            }
        }
    }

    [Fact]
    public void GenerateShortCode_ProducesUniqueCodes()
    {
        var codes = new HashSet<string>();
        for (var i = 0; i < 1000; i++)
        {
            codes.Add(FileIndexer.GenerateShortCode());
        }
        Assert.Equal(1000, codes.Count);
    }
}
