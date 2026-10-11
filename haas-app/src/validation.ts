import { ValidationError, type Field } from "./errors.ts";
import { Double, Integer } from "./math.ts"

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
 * This declared constant is a compile-time marker that only exists for the type checker; nothing is created
 * at runtime. It is not exported, so no other file can attach it to a value, which means the validators
 * below are the only way to produce the checked types.
 */
declare const validated: unique symbol

/**
 * This type is the marker added to a value once a validator has checked it. Kind is a label such as
 * "Quantity" or "SignIn", so values checked by different validators cannot be mixed up.
 */
type Validated<Kind extends string> = {readonly [validated]: Kind};

/**
 * This type is an Integer that validateQuantity() has checked: greater than 0 and no more than the limit.
 * The API's check-out and check-in calls only accept this type, so a quantity cannot be sent unchecked.
 */
export type Quantity = Integer & Validated<"Quantity">;

/**
 * This type is a project ID string that validateProjectID() has checked against the project ID rules.
 * The API's create and join project calls only accept this type.
 */
export type ProjectID = string & Validated<"ProjectID">;

/**
 * This type is a userID and password that validateCreds() has checked in "signIn" mode (both filled in).
 * The API's login call only accepts this type.
 */
export type SignInCredentials = {readonly userID: string; readonly password: string} & Validated<"SignIn">;

/**
 * This type is a userID and password that validateCreds() has checked in "signUp" mode (the full rules).
 * The API's add-user call only accepts this type, so sign-in checks alone cannot be used to create an account.
 */
export type NewUserCredentials = {readonly userID: string; readonly password: string} & Validated<"SignUp">;

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
    // An Integer is always a whole number, so parseQuantity() has already ruled out text and decimals.
    if (value.intValue() <= 0) {
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
 * This overload method implements the sign-in form's check: both fields must be filled in. The server
 * decides whether they are correct, so older accounts keep working if the sign-up rules get stricter.
 * @param userID This parameter is the userID the user typed.
 * @param password This parameter is the password the user typed.
 * @param mode This parameter is "signIn", which selects this overload.
 * @returns This method returns the credentials as SignInCredentials, ready for the API's login call.
 */
export function validateCreds(userID: string, password: string, mode: "signIn"): SignInCredentials;

/**
 * This overload method implements the New User form's check: the full userID and password rules
 * (length and allowed characters) are applied, and every problem is reported at once.
 * @param userID This parameter is the userID the user typed.
 * @param password This parameter is the password the user typed.
 * @param mode This parameter is "signUp", which selects this overload.
 * @returns This method returns the credentials as NewUserCredentials, ready for the API's add-user call.
 */
export function validateCreds(userID: string, password: string, mode: "signUp"): NewUserCredentials;

/**
 * This function validates the sign-in / new-user form. It runs every credential check so all
 * problems are reported together, and throws a ValidationError listing them if any check fails.
 * @param userID This parameter is the userID the user typed.
 * @param password This parameter is the password the user typed.
 * @param mode This parameter is which form is being checked: "signIn" (fields must be filled in)
 * or "signUp" (full rules for a new account).
 */
export function validateCreds(userID: string, password: string, mode: CredsMode): SignInCredentials | NewUserCredentials {
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
    
    return {userID, password} as SignInCredentials | NewUserCredentials;
}

/**
 * This function turns the quantity text the user typed into an Integer, and throws a ValidationError if it
 * is not a whole number. Decimals such as "2.5" get their own message, recognized with Double.
 * Exponent notation ("1e0"), hex and other text get the general whole-number message.
 * @param text This parameter is the raw text from the quantity box.
 * @returns This function returns the parsed quantity, ready for validateQuantity().
 */
export function parseQuantity(text: string): Integer {
    try {
        return Integer.valueOf(text);
    } catch {
        let message = "Quantity must be a whole number!";
        try {
            // Checking for "." keeps a too-large whole number like "99999999999999999" on the general message.
            if (text.includes(".")) {
                Double.valueOf(text);
                message = "Quantity must be a whole number, not a double!";
            }
        } catch {
            // Not a decimal either, so the general message stays.
        }
        throw new ValidationError([{object: "quantity", message}]);
    }
}

/**
 * This function validates a check-out or check-in quantity and throws a ValidationError if it is invalid.
 * @param value This parameter is the number of units requested.
 * @param max This parameter is the most units allowed: the set's available count for check-out,
 * or the units this project holds for check-in.
 */
export function validateQuantity(value: Integer, max: Integer): Quantity {
    let quantityMsg = checkQuantity(value, max);
    if (quantityMsg !== null) {
        throw new ValidationError([{object: "quantity", message: quantityMsg}]);
    }

    return value as Quantity;
}

/**
 * This function validates a project ID before a create or join request and throws a ValidationError if it is invalid.
 * @param value This parameter is the project ID the user typed.
 */
export function validateProjectID(value: string): ProjectID {
    let projectidMsg = checkProjectID(value);
    if (projectidMsg !== null) {
        throw new ValidationError([{object: "projectID", message: projectidMsg}]);
    }

    return value as ProjectID;
}
