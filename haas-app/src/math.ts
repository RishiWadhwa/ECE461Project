/**
 * This class holds the app's number-parsing rules. Number() is too lenient for user input:
 * Number("") is 0 and Number("1e0") is 1, so quantities are parsed here instead.
 */
export class IntMath {
    /**
     * This pattern is a whole number written as plain digits with no leading zeros or surrounding spaces.
     * A leading minus is allowed so validation can report negatives as "greater than 0" rather than "not a whole number".
     */
    private static readonly INT_PATTERN = /^(0|-?[1-9]\d*)$/;

    /**
     * This function parses text the user typed as a whole number.
     * @param text This parameter is the raw text from the input field.
     * @returns This function returns the integer, or NaN if the text is blank, has spaces, is not plain digits,
     * or has a leading zero (e.g. " 12 ", "1e0", "2.5", "007", "-0", "abc").
     */
    static parseInt(text: string): number {
        return IntMath.INT_PATTERN.test(text) ? Number(text) : Number.NaN;
    }
}
