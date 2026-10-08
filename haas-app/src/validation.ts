import { ValidationError, type Field } from "./errors";

// We must agree to set values with the backend team.
/**
 * This variable is the fewest characters a userID may have.
 */
const MIN_USERID_LENGTH = 0;

/**
 * This variable is the fewest characters a password may have.
 */
const MIN_PASSWORD_LENGTH = 0;

/**
 * This variable is the pattern a whole userID must match: one or more letters or digits, nothing else.
 */
const USERID_ALLOWED_CHARS = /^[a-zA-Z0-9]+$/;

/**
 * This function checks a single userID against the userID rules.
 * @param value This parameter is the userID the user typed.
 * @returns This method returns a message describing the first rule the userID breaks, or null if it is valid.
 */
function checkUserID(value: string): string | null {
    if (value.length === 0) {
        return "UserID is required.";
    } else if (value.length < MIN_USERID_LENGTH) {
        return `UserID must be at least ${MIN_USERID_LENGTH} characters!`
    } else {
        // validate the characters.
        if (!USERID_ALLOWED_CHARS.test(value)) {
            return "This UserID contains invalid characters!";
        }
    }

    return null;
}

/**
 * This function checks a single password against the password rules.
 * @param value This parameter is the password the user typed.
 * @returns This method returns a message describing the first rule the password breaks, or null if it is valid.
 */
function checkPassword(value: string): string | null {
    if (value.length === 0) {
        return "Password is needed!";
    } else if (value.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters!`;
    }
    // We can add more password rules here!
    return null;
}

/**
 * This function checks a hardware quantity the user wants to check out or check in.
 * @param value This parameter is the number of units requested.
 * @param max This parameter is the most units allowed: the set's available count for check-out,
 * or the units this project holds for check-in.
 * @returns This method returns a message describing the first rule the quantity breaks, or null if it is valid.
 */
function checkQuantity(value: number, max: number): string | null {
    if (Number.isNaN(value)) {
        return "Quantity must be a number!";
    } else if (!Number.isInteger(value)) {
        return "Quantity must be a whole number, not a double!";
    } else if (value <= 0) {
        return "Quantity must be greater than 0!";
    } else if (value > max) {
        return `Only ${max} units available`;
    }
    return null;
}

/**
 * This function validates the sign-in / new-user form. It runs every credential check so all
 * problems are reported together, and throws a ValidationError listing them if any check fails.
 * @param userID This parameter is the userID the user typed.
 * @param password This parameter is the password the user typed.
 */
export function validateCreds(userID: string, password: string): void {
    const issues: {object: Field, message: string}[] = [];

    const userIDMsg = checkUserID(userID)
    if (userIDMsg !== null) {
        issues.push({object: "userID", message: userIDMsg});
    }

    const passwordMsg = checkPassword(password)
    if (passwordMsg !== null) {
        issues.push({object: "password", message: passwordMsg});
    }

    if (issues.length !== 0 ) {
        throw new ValidationError(issues);
    }

    return;
}

/**
 * This function validates a check-out or check-in quantity and throws a ValidationError if it is invalid.
 * @param value This parameter is the number of units requested.
 * @param max This parameter is the most units allowed: the set's available count for check-out,
 * or the units this project holds for check-in.
 */
export function validateQuantity(value: number, max: number): void {
    let quantityMsg = checkQuantity(value, max);
    if (quantityMsg !== null) {
        throw new ValidationError([{object: "quantity", message: quantityMsg}]);
    }
}
