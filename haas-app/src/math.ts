import { NumberFormatError } from "./errors.ts"

/**
 * This class wraps a whole number, much like Java's Integer. Its constructor is private, so the only way
 * to make one is through of() or valueOf(), which both check the value first. That means every Integer
 * that exists is already a valid whole number, and code that receives one does not need to check it again.
 * Number() is too lenient for user input (Number("") is 0, Number("1e3") is 1000), so user-typed
 * numbers come in through valueOf() instead.
 */
export class Integer {

    /**
     * This field holds the wrapped whole number. It is readonly, so an Integer never changes after it is made.
     */
    private readonly value: number

    /**
     * This internal constructor stores the value without checking it. It is private so that of() and
     * valueOf() are the only ways to create an Integer, and both validate the value first.
     * @param value This parameter is the whole number to wrap, already checked by of().
     */
    private constructor(value: number) {
        this.value = value
    }

    /**
     * This method implements Java's Integer.valueOf(int): it wraps a number that is already a number,
     * such as a count returned by the API. It throws a NumberFormatError if the number is a decimal,
     * NaN, Infinity, or too large to be stored exactly (beyond Number.MAX_SAFE_INTEGER).
     * @param n This parameter is the number to wrap.
     * @returns This method returns an Integer holding n.
     */
    static of(n: number): Integer {
        if (!Number.isSafeInteger(n)) {throw new NumberFormatError(`Not a safe integer: ${n}`);}
        return new Integer(n);
    }

    /**
     * This method implements Java's Integer.valueOf(String): it turns text the user typed into an Integer.
     * Surrounding spaces are ignored, and the rest must be digits with an optional + or - sign in front,
     * so "", "1e3", "0x10", "2.5" and "12abc" are all rejected. It throws a NumberFormatError describing
     * the input; callers such as validation.ts turn that into a message for the specific field.
     * @param text This parameter is the raw text from an input box.
     * @returns This method returns an Integer holding the parsed value.
     */
    static valueOf(text: string): Integer {
        const t = text.trim();
        if (t === "") {
            throw new NumberFormatError("Empty string");
        }
        if (!/^[+-]?\d+$/.test(t)) {
            throw new NumberFormatError(`For input string: "${text}"`);
        }
        // Builds the value one digit at a time instead of calling Number(). Past MAX_SAFE_INTEGER
        // the result is no longer exact, so Integer.of() rejects it.
        let n = 0;
        for (const c of t.replace(/^[+-]/, "")) {
            n = n * 10 + (c.charCodeAt(0) - 48);
        }
        return Integer.of(t.startsWith("-") ? -n : n);
    }

    /**
     * This method implements Java's intValue(): it unwraps the Integer back into a plain number, for
     * places that need one, such as an API call or arithmetic.
     * @returns This method returns the wrapped value as a number.
     */
    intValue(): number {
        return this.value
    }

    /**
     * This method implements Java's compareTo(): it compares this Integer with another by value. Use it
     * instead of == or ===, which compare whether two objects are the same object, not their values.
     * @param other This parameter is the Integer to compare against.
     * @returns This method returns a negative number if this is smaller, 0 if they are equal,
     * or a positive number if this is larger.
     */
    compareTo(other: Integer): number {
        return this.value - other.value
    }

    /**
     * This method implements Java's toString(): it lets an Integer be used directly inside a string,
     * e.g. `Only ${max} units available` prints the number rather than [object Object].
     * @returns This method returns the value written as decimal digits.
     */
    toString(): string {
        return String(this.value);
    }

    /**
     * This method is called automatically by JSON.stringify, so an Integer in a request body is sent
     * as a plain number (5) rather than as an object ({"value":5}).
     * @returns This method returns the wrapped value as a number.
     */
    toJSON(): number {
        return this.value;
    }
}

/**
 * This variable is the pattern decimal text must match for Double and Float: an optional sign, then digits
 * with an optional decimal point ("2.5", "3.", ".5", "7"). Exponent notation ("1e0"), hex, Infinity and
 * NaN are not matched, so they are rejected.
 */
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/**
 * This variable is the largest finite value a 32-bit float can hold, the same as Java's Float.MAX_VALUE.
 */
const FLOAT_MAX = 3.4028234663852886e38;

/**
 * This function checks text for Double.valueOf() and Float.valueOf() and converts it to a number.
 * @param text This parameter is the raw text from an input box.
 * @returns This function returns the number the text spells out.
 */
function parseDecimal(text: string): number {
    const t = text.trim();
    if (t === "") {
        throw new NumberFormatError("Empty string");
    }
    if (!DECIMAL.test(t)) {
        throw new NumberFormatError(`For input string: "${text}"`);
    }
    // The regex above already allows only plain decimal text. parseFloat rounds it correctly to the nearest double.
    return parseFloat(t);
}

/**
 * This class wraps a 64-bit decimal number, much like Java's Double. It works the same way as Integer:
 * the constructor is private, and of() and valueOf() check the value first. Unlike Java, valueOf()
 * rejects exponent notation ("1e0") so that every decimal the user types is written out in full.
 * Quantities are never Doubles. validation.ts uses this class only to recognize decimal input and
 * reject it with a clear message.
 */
export class Double {

    /**
     * This field holds the wrapped number. It is readonly, so a Double never changes after it is made.
     */
    private readonly value: number

    /**
     * This internal constructor stores the value without checking it. It is private so that of() and
     * valueOf() are the only ways to create a Double.
     * @param value This parameter is the finite number to wrap, already checked by of().
     */
    private constructor(value: number) {
        this.value = value
    }

    /**
     * This method implements Java's Double.valueOf(double): it wraps a number that is already a number.
     * It throws a NumberFormatError for NaN or Infinity.
     * @param n This parameter is the number to wrap.
     * @returns This method returns a Double holding n.
     */
    static of(n: number): Double {
        if (!Number.isFinite(n)) {throw new NumberFormatError(`Not a finite number: ${n}`);}
        return new Double(n);
    }

    /**
     * This method implements Java's Double.valueOf(String), but it accepts only plain decimal text.
     * Surrounding spaces are ignored. "2.5", "-3", ".5" and "7." are accepted. "", "1e0", "0x10",
     * "Infinity" and "2.5abc" are rejected with a NumberFormatError.
     * @param text This parameter is the raw text from an input box.
     * @returns This method returns a Double holding the parsed value.
     */
    static valueOf(text: string): Double {
        return Double.of(parseDecimal(text));
    }

    /**
     * This method implements Java's doubleValue(): it unwraps the Double back into a plain number.
     * @returns This method returns the wrapped value as a number.
     */
    doubleValue(): number {
        return this.value
    }

    /**
     * This method implements Java's compareTo(): it compares this Double with another by value.
     * @param other This parameter is the Double to compare against.
     * @returns This method returns a negative number if this is smaller, 0 if they are equal,
     * or a positive number if this is larger.
     */
    compareTo(other: Double): number {
        return this.value - other.value
    }

    /**
     * This method implements Java's toString(): it lets a Double be used directly inside a string.
     * @returns This method returns the value written as a decimal.
     */
    toString(): string {
        return String(this.value);
    }

    /**
     * This method is called automatically by JSON.stringify, so a Double is sent as a plain number.
     * @returns This method returns the wrapped value as a number.
     */
    toJSON(): number {
        return this.value;
    }
}

/**
 * This class wraps a 32-bit decimal number, much like Java's Float. It accepts the same text as Double,
 * but rounds the value to 32-bit precision (Math.fround) and rejects anything too large for a float.
 * Like Double, it is never an accepted quantity. It exists so every numeric form has a class.
 */
export class Float {

    /**
     * This field holds the wrapped number, already rounded to 32-bit precision.
     */
    private readonly value: number

    /**
     * This internal constructor stores the value without checking it. It is private so that of() and
     * valueOf() are the only ways to create a Float.
     * @param value This parameter is the number to wrap, already rounded and checked by of().
     */
    private constructor(value: number) {
        this.value = value
    }

    /**
     * This method implements Java's Float.valueOf(float): it rounds a number to 32-bit precision and wraps it.
     * It throws a NumberFormatError for NaN, Infinity, or a value beyond the float range (FLOAT_MAX).
     * @param n This parameter is the number to wrap.
     * @returns This method returns a Float holding n rounded to 32-bit precision.
     */
    static of(n: number): Float {
        if (!Number.isFinite(n) || Math.abs(n) > FLOAT_MAX) {throw new NumberFormatError(`Not a finite float: ${n}`);}
        return new Float(Math.fround(n));
    }

    /**
     * This method implements Java's Float.valueOf(String), with the same rules as Double.valueOf():
     * plain decimal text only, no exponent notation.
     * @param text This parameter is the raw text from an input box.
     * @returns This method returns a Float holding the parsed value.
     */
    static valueOf(text: string): Float {
        return Float.of(parseDecimal(text));
    }

    /**
     * This method implements Java's floatValue(): it unwraps the Float back into a plain number.
     * @returns This method returns the wrapped value as a number.
     */
    floatValue(): number {
        return this.value
    }

    /**
     * This method implements Java's compareTo(): it compares this Float with another by value.
     * @param other This parameter is the Float to compare against.
     * @returns This method returns a negative number if this is smaller, 0 if they are equal,
     * or a positive number if this is larger.
     */
    compareTo(other: Float): number {
        return this.value - other.value
    }

    /**
     * This method implements Java's toString(): it lets a Float be used directly inside a string.
     * @returns This method returns the value written as a decimal.
     */
    toString(): string {
        return String(this.value);
    }

    /**
     * This method is called automatically by JSON.stringify, so a Float is sent as a plain number.
     * @returns This method returns the wrapped value as a number.
     */
    toJSON(): number {
        return this.value;
    }
}
