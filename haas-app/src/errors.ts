/**
 * This type defines the possible fields that can be associated with validation errors in the application.
 */
export type Field = "userID" | "password" | "projectID" | "quantity";

/**
 * This file contains custom error classes and a utility function for handling errors in the application.
 */
export class AppError extends Error {

    /**
     * This is the name of the error class, which is set to "AppError" for instances of this class.
     */
    name: string;

    /**
     * This is the constructor for the AppError class, which extends the built-in Error class.
     * @param message This is the error message that will be associated with the error instance.
     */
    constructor(message: string) {
        super(message);
        this.name = "AppError";
    }
}

export class NumberFormatError extends AppError {
    constructor(message: string) {
        super(message);
        this.name = "NumberFormatError";
    }
}

/**
 * Thrown when a request never got an answer from the server: it is down, the network dropped,
 * or it took longer than REQUEST_TIMEOUT_MS. Unlike ApiError there is no HTTP status.
 */
export class NetworkError extends AppError {
    /**
     * This constructor method creates a NetworkError with the given message and sets its name to "NetworkError".
     * @param message This parameter is the text shown to the user, e.g. that the server could not be reached or timed out.
     */
    constructor(message: string) {
        super(message)
        this.name = 'NetworkError'
    }
}

/**
 * This class represents a validation error that extends the AppError class. 
 * It includes additional properties for the type of validation error and the specific issues that caused the error.
 */
export class ValidationError extends AppError {

    /**
     * This property holds an array of objects, each containing a field (object) and a corresponding error message.
     */
    issues: {object: Field , message: string}[];

    /**
     * The class constructor initializes a new instance of the ValidationError class with a list of validation issues.
     * @param issues This parameter is an array of objects, where each object contains a field (object) 
     * and a corresponding error message.
     */
    constructor(issues: {object: Field, message: string}[]) {
        // call parent constructor with summary message
        let summaryMsg: string;
        if (issues.length === 0) {
            summaryMsg = "Validation error occurred. Invalid input provided.";
        } else if (issues.length === 1) {
            summaryMsg = issues[0].message;
        } else {
            summaryMsg = "Error: " + issues.map(issue => issue.message).join("; ");
        }
        super(summaryMsg);
        this.name = "ValidationError";
        this.issues = issues;
    }

    /**
     * This method retrieves the error message associated with 
     * a specific field (object) from the list of validation issues.
     * @param object The parameter is the field for which the error message is being requested.
     * @returns This method returns the error message associated with the specified field if it exists; 
     * otherwise, it returns undefined.
     */
    messageFor(object: Field): string | undefined {
        for (const issue of this.issues) {
            if (issue.object === object) {
                return issue.message;
            }
        }
        return undefined;
    }
}

/**
 * This class represents an API error that extends the AppError class. 
 * It includes an additional property for the HTTP status code associated with the error.
 */
export class ApiError extends AppError {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }

    /**
     * This method checks if the error is related to authentication 
     * or authorization issues based on the HTTP status code.
     * @returns This method returns true if the status code is 401 (Unauthorized) or 403 (Forbidden), 
     * indicating an authentication or authorization error; otherwise, it returns false.
     */
    isAuth(): boolean {
        return this.status === 401 || this.status === 403;
    }
    
    /**
     * This method checks if the error is related to a resource not being found based on the HTTP status code.
     * @returns This method returns true if the status code is 404 (Not Found), 
     * indicating that the requested resource was not found; otherwise, it returns false.
     */
    isNotFound(): boolean {
        return this.status === 404;
    }

    /**
     * This method checks if the server refused the request due to a conflict based on the HTTP status code.
     * @returns This method returns true if the status code is 409 (Conflict), 
     * indicating that the request could not be completed due to a conflict; otherwise, it returns false.
     */
    isConflict(): boolean {
        return this.status === 409;
    }

    /**
     * This method checks if the error is related to server issues based on the HTTP status code.
     * @returns This method returns true if the status code is in the range of 500 to 599, indicating a server error; 
     * otherwise, it returns false.
     */
    isServer(): boolean {
        return this.status >= 500 && this.status < 600;
    }
}

/**
 * Returns the appropriate error message based on the type of error provided.
 * @param error this is the error object that can be of type AppError, Error, or any other unknown type.
 * @param fallbackMessage This the message to return if the error is not of type AppError or Error.
 * @returns return the appropriate error message.
 */
export function errorMessage(error: unknown, fallbackMessage: string) : string {
    if (error instanceof AppError) {
        return error.message;
    } else if (error instanceof Error) {
        return error.message;
    }
    return fallbackMessage;
}