import { ValidationError, type Field } from "./errors.ts";
import { Integer } from "./math.ts"

// We must agree to set values with the backend team.
/**
 * This variable is the fewest characters a userID may have.
 */
const MIN_USERID_LENGTH = 3;

/**
 * This variable is the fewest characters a password may have.
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * This variable is the fewest characters a project ID may have.
 */
const MIN_PROJECT_ID_LENGTH = 8;

/**
 * This variable is the pattern a whole userID or project ID must match: one or more letters or digits, nothing else.
 */
const ALLOWED_CHARS = /^[a-zA-Z0-9]+$/;

/**
 * This type is which form validateCreds is checking: "signIn" only requires both fields to be filled in,
 * while "signUp" applies the full userID and password rules to a new account.
 */
type CredsMode = "signIn" | "signUp"

/**
 * This function checks a single userID against the userID rules.
 * @param value This parameter is the userID the user typed.
 * @returns This method returns a message describing the first rule the userID breaks, or null if it is valid.
 */
function checkUserID(value: string): string | null {
    const requiredMsg = checkRequired(value, "UserID");
    if (requiredMsg != null) {
        return requiredMsg;
    } else if (value.length < MIN_USERID_LENGTH) {
        return `UserID must be at least ${MIN_USERID_LENGTH} characters!`
    } else {
        // validate the characters.
        if (!ALLOWED_CHARS.test(value)) {
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
    const requiredMsg = checkRequired(value, "Password")
    if (requiredMsg != null) {
        return requiredMsg;
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
function checkQuantity(value: Integer, max: Integer): string | null {
    if (Number.isNaN(value)) {
        return "Quantity must be a whole number!";
    } else if (!Number.isInteger(value)) {
        return "Quantity must be a whole number, not a double!";
    } else if (value.intValue() <= 0) {
        return "Quantity must be greater than 0!";
    } else if (value.compareTo(max) > 0) {
        return `Only ${max} units available`;
    }
    return null;
}

/**
 * This function checks that a field was filled in. It is shared by the other check functions
 * so every form uses the same "required" message.
 * @param value This parameter is the text the user typed into the field.
 * @param label This parameter is the field's name as shown in the message, e.g. "UserID" or "Password".
 * @returns This function returns "<label> is required!" if the value is empty, or null if it is filled in.
 */
function checkRequired(value: string, label: string): string | null {
    if (value.length === 0) {
        return `${label} is required!`
    }
    return null
}

/**
 * This function checks a single project ID against the project ID rules.
 * @param value This parameter is the project ID the user typed to create or join a project.
 * @returns This function returns a message describing the first rule the project ID breaks, or null if it is valid.
 */
function checkProjectID(value: string): string | null {
    const requiredMsg = checkRequired(value, "Project ID");
    if (requiredMsg != null) {
        return requiredMsg;
    } else if (value.length < MIN_PROJECT_ID_LENGTH) {
        return `Project ID must be at least ${MIN_PROJECT_ID_LENGTH} characters`;
    } else if (!ALLOWED_CHARS.test(value)) {
        return "Project ID can only contain letters and digits";
    }
    return null
}
 
/**
 * This function validates the sign-in / new-user form. It runs every credential check so all
 * problems are reported together, and throws a ValidationError listing them if any check fails.
 * @param userID This parameter is the userID the user typed.
 * @param password This parameter is the password the user typed.
 * @param mode This parameter is which form is being checked: "signIn" (fields must be filled in)
 * or "signUp" (full rules for a new account).
 */
export function validateCreds(userID: string, password: string, mode: CredsMode): void {
    const issues: {object: Field, message: string}[] = [];
    let userIDMsg: string | null;
    let passwordMsg: string | null;

    if (mode === "signIn") {
        userIDMsg = checkRequired(userID, "UserID");
        passwordMsg = checkRequired(password, "Password");
    } else {
        userIDMsg = checkUserID(userID)
        passwordMsg = checkPassword(password)
    }

    if (userIDMsg !== null) {
        issues.push({object: "userID", message: userIDMsg});
    }
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
export function validateQuantity(value: Integer, max: Integer): void {
    let quantityMsg = checkQuantity(value, max);
    if (quantityMsg !== null) {
        throw new ValidationError([{object: "quantity", message: quantityMsg}]);
    }
}

/**
 * This function validates a project ID before a create or join request and throws a ValidationError if it is invalid.
 * @param value This parameter is the project ID the user typed.
 */
export function validateProjectID(value: string): void {
    let projectidMsg = checkProjectID(value);
    if (projectidMsg !== null) {
        throw new ValidationError([{object: "projectID", message: projectidMsg}]);
    }
}
