/**
 * This file contains custom error classes and a utility function for handling errors in the application.
 */
class AppError extends Error {

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

/**
 * This class represents a validation error that extends the AppError class. 
 * It includes additional properties for the type of validation error and the specific issues that caused the error.
 */
class ValidationError extends AppError {
    type: string;
    issues: string[];
    constructor(issues: string[]) {
        // call parent constructor with summary message
        // set name
        // store the issues
    }

    messageFor(type: string): string {
        // return msg of the first issue whose field matches, else return nothing.
    }
}

/**
 * This class represents an API error that extends the AppError class. 
 * It includes an additional property for the HTTP status code associated with the error.
 */
class ApiError extends AppError {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }

    
}

/**
 * Returns the appropriate error message based on the type of error provided.
 * @param error this is the error object that can be of type AppError, Error, or any other unknown type.
 * @param fallbackMessage This the message to return if the error is not of type AppError or Error.
 * @returns return the appropriate error message.
 */
function errorMessage(error: unknown, fallbackMessage: string) : string {
    if (error instanceof AppError) {
        return error.message;
    } else if (error instanceof Error) {
        return error.message;
    }
    return fallbackMessage;
}