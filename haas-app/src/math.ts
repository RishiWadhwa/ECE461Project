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
        return Integer.of(Number(t));
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
 * 
 */
export class Double {

}

/**
 * 
 */
export class Float {

}