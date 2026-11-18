import { ValidationError, type Field } from "./errors.ts";
import type { Integer } from "./math.ts"
import type { Hint } from "./useHints.ts"

/**
 * This variable is the fewest characters a userID may have.
 */
const MIN_USERID_LENGTH = 5;

/**
 * This variable is the maximum characters allowed for a userID.
 */
const MAX_USERID_LENGTH = 16;

/**
 * This variable is the fewest characters a password may have.
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * This variable is the maximum characters allowed for a password.
 */
const MAX_PASSWORD_LENGTH = 64;

/**
 * This variable is the fewest characters a project ID may have.
 */
const MIN_PROJECT_ID_LENGTH = 8;

/**
 * This variable is the pattern a whole userID must match: one or more letters or digits, nothing else.
 */
const ALLOWED_CHARS = /^[a-zA-Z0-9]+$/;

/**
 * This variable is the pattern a project ID must match: "PROJ" followed by digits only, in any letter case.
 * Together with MIN_PROJECT_ID_LENGTH it means PROJ and at least 4 digits, which also satisfies Flask's
 * _project_id() in backend/project_routes.py (PROJ and at least 3 digits, uppercased before checking).
 */
const PROJECT_ID_PATTERN = /^PROJ[0-9]+$/i;

/**
 * These variables are the failure bits the check functions below return. Each check tests every rule and sets
 * one bit per rule the value breaks, so 0 means valid. The bits are numbered in priority order: the lowest set
 * bit is the problem reported on submit (see firstMessage()), and the requirement checklists shown while typing
 * read the individual bits. That way each rule is written once and the form and the checklist cannot disagree.
 */
const REQUIRED = 1 << 0;
const TOO_SHORT = 1 << 1;
const TOO_LONG = 1 << 2;
const NO_PREFIX = 1 << 3;
const BAD_CHARS = 1 << 4;

/**
 * This type maps each failure bit a check can set to the message shown for it.
 */
type Messages = Partial<Record<number, string>>;

const USERID_MESSAGES: Messages = {
    [REQUIRED]: "UserID is required!",
    [TOO_SHORT]: `UserID must be at least ${MIN_USERID_LENGTH} characters!`,
    [TOO_LONG]: `UserID must be at most ${MAX_USERID_LENGTH} characters!`,
    [BAD_CHARS]: "This UserID contains invalid characters!",
};

const PASSWORD_MESSAGES: Messages = {
    [REQUIRED]: "Password is required!",
    [TOO_SHORT]: `Password must be at least ${MIN_PASSWORD_LENGTH} characters!`,
    [TOO_LONG]: `Password must be at most ${MAX_PASSWORD_LENGTH} characters!`,
};

const PROJECT_ID_FORMAT = "Project ID must be PROJ followed by at least 3 digits";
const PROJECT_ID_MESSAGES: Messages = {
    [REQUIRED]: "Project ID is required!",
    [TOO_SHORT]: `Project ID must be at least ${MIN_PROJECT_ID_LENGTH} characters`,
    [NO_PREFIX]: PROJECT_ID_FORMAT,
    [BAD_CHARS]: PROJECT_ID_FORMAT,
};

/**
 * This function picks the message for the highest-priority failure in a check's result.
 * @param failed This parameter is the bitmask a check function returned.
 * @param messages This parameter is that field's message for each bit.
 * @returns This function returns the message for the lowest set bit (failed & -failed isolates it), or null if nothing failed.
 */
function firstMessage(failed: number, messages: Messages): string | null {
    return failed === 0 ? null : messages[failed & -failed] ?? null;
}

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
 * This function checks a single userID against every userID rule.
 * @param value This parameter is the userID the user typed, or has typed so far.
 * @returns This method returns a bitmask of the rules the userID breaks (REQUIRED, TOO_SHORT, TOO_LONG,
 * BAD_CHARS), or 0 if it is valid.
 */
function checkUserID(value: string): number {
    let failed = 0;
    if (value.trim().length === 0) failed |= REQUIRED;
    if (value.length < MIN_USERID_LENGTH) failed |= TOO_SHORT;
    if (value.length > MAX_USERID_LENGTH) failed |= TOO_LONG;
    if (!ALLOWED_CHARS.test(value)) failed |= BAD_CHARS;
    return failed;
}

/**
 * This function checks a single password against every password rule.
 * @param value This parameter is the password the user typed, or has typed so far.
 * @returns This method returns a bitmask of the rules the password breaks (REQUIRED, TOO_SHORT, TOO_LONG),
 * or 0 if it is valid.
 */
function checkPassword(value: string): number {
    let failed = 0;
    if (value.trim().length === 0) failed |= REQUIRED;
    if (value.length < MIN_PASSWORD_LENGTH) failed |= TOO_SHORT;
    if (value.length > MAX_PASSWORD_LENGTH) failed |= TOO_LONG;
    // We can add more password rules here: give each one a bit and a message in PASSWORD_MESSAGES.
    return failed;
}

/**
 * This function checks a hardware quantity the user wants to check out or check in.
 * @param value This parameter is the number of units requested.
 * @param max This parameter is the most units allowed: the set's available count for check-out,
 * or the units this project holds for check-in.
 * @returns This method returns a message describing the first rule the quantity breaks, or null if it is valid.
 */
function checkQuantity(value: Integer, max: Integer): string | null {
    // An Integer is always a whole number, so Integer.valueOf() has already ruled out text and decimals.
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
    if (value.trim().length === 0) {
        return `${label} is required!`
    }
    return null
}

/**
 * This function checks a single project ID against every project ID rule.
 * @param value This parameter is the project ID the user typed to create or join a project, or has typed so far.
 * @returns This function returns a bitmask of the rules the project ID breaks (REQUIRED, TOO_SHORT,
 * NO_PREFIX, BAD_CHARS), or 0 if it is valid.
 */
function checkProjectID(value: string): number {
    let failed = 0;
    if (value.trim().length === 0) failed |= REQUIRED;
    if (value.length < MIN_PROJECT_ID_LENGTH) failed |= TOO_SHORT;
    if (!/^PROJ/i.test(value)) failed |= NO_PREFIX;
    if (!PROJECT_ID_PATTERN.test(value)) failed |= BAD_CHARS;
    return failed;
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
        userIDMsg = firstMessage(checkUserID(userID), USERID_MESSAGES)
        passwordMsg = firstMessage(checkPassword(password), PASSWORD_MESSAGES)
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
 * @returns This function returns the ID in uppercase, which is the form the backend stores and returns.
 */
export function validateProjectID(value: string): ProjectID {
    let projectidMsg = firstMessage(checkProjectID(value), PROJECT_ID_MESSAGES);
    if (projectidMsg !== null) {
        throw new ValidationError([{object: "projectID", message: projectidMsg}]);
    }

    return value.toUpperCase() as ProjectID;
}

/**
 * This function lists the userID requirements for the checklist shown while a new userID is typed. Each line
 * reads its bits from checkUserID(), so every line is met exactly when validateCreds() accepts the userID.
 * @param value This parameter is the userID typed so far (already trimmed, as the forms do before validating).
 */
export function userIDRules(value: string): Required<Hint>[] {
    const failed = checkUserID(value);
    return [
        {label: `${MIN_USERID_LENGTH}–${MAX_USERID_LENGTH} characters`, met: (failed & (TOO_SHORT | TOO_LONG)) === 0},
        {label: "Letters and digits only", met: (failed & BAD_CHARS) === 0},
    ];
}

/**
 * This function lists the password requirements, read from checkPassword(). A password of only spaces
 * sets REQUIRED, so it does not count as meeting the length line.
 * @param value This parameter is the password typed so far.
 */
export function passwordRules(value: string): Required<Hint>[] {
    const failed = checkPassword(value);
    return [
        {label: `${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters`, met: (failed & (REQUIRED | TOO_SHORT | TOO_LONG)) === 0},
    ];
}

/**
 * This function lists the project ID requirements, read from checkProjectID():
 * "PROJ" then digits, at least 8 characters in all (so PROJ and at least 4 digits).
 * @param value This parameter is the project ID typed so far (already trimmed).
 */
export function projectIDRules(value: string): Required<Hint>[] {
    const failed = checkProjectID(value);
    return [
        {label: "Starts with PROJ (any letter case)", met: (failed & NO_PREFIX) === 0},
        {label: "Followed by digits only", met: (failed & BAD_CHARS) === 0},
        {label: `At least ${MIN_PROJECT_ID_LENGTH} characters (PROJ and 4 digits)`, met: (failed & TOO_SHORT) === 0},
    ];
}
