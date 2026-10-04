export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, identifier: string) {
    super(`${entity.toUpperCase()}_NOT_FOUND`, `${entity} '${identifier}' was not found.`, 404);
  }
}

export class StationNotFoundError extends NotFoundError {
  constructor(idOrSlug: string) {
    super("Station", idOrSlug);
  }
}

export class CityNotFoundError extends NotFoundError {
  constructor(slug: string) {
    super("City", slug);
  }
}

export class PincodeNotFoundError extends NotFoundError {
  constructor(pincode: string) {
    super("Pincode", pincode);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class DatabaseUnavailableError extends DomainError {
  constructor(message = "Database service is temporarily unavailable.") {
    super("DATABASE_UNAVAILABLE", message, 503);
  }
}

export class RateLimitExceededError extends DomainError {
  constructor(message = "Too many requests. Please try again later.") {
    super("RATE_LIMIT_EXCEEDED", message, 429);
  }
}
