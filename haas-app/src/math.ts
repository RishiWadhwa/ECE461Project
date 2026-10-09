import { NumberFormatError } from "./errors.ts"

/**
 * 
 */
export class Integer {

    /**
     * 
     */
    private readonly value: number

    /**
     * 
     * @param value 
     */
    private constructor(value: number) {
        this.value = value
    }

    /**
     * 
     * @param n 
     * @returns 
     */
    static of(n: number): Integer {
        if (!Number.isSafeInteger(n)) {throw new NumberFormatError(`Not a safe integer: ${n}`);}
        return new Integer(n);
    }

    /**
     * 
     * @param text 
     * @returns 
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
     * 
     * @returns 
     */
    intValue(): number {
        return this.value
    }

    /**
     * 
     * @param other 
     * @returns 
     */
    compareTo(other: Integer): number {
        return this.value - other.value
    }

    /**
     * 
     * @returns 
     */
    toString(): string {
        return String(this.value);
    }

    /**
     * 
     * @returns 
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