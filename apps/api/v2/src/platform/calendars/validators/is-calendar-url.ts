import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isURL
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsCalendarUrlConstraint implements ValidatorConstraintInterface {
  validate(url: any) {
    if (typeof url !== 'string') return false;
    
    // This Enforce protocols and require a real domain (blocks 'localhost')
    return isURL(url, { 
      protocols: ['http', 'https'], 
      require_protocol: true,
      require_valid_protocol: true,
      require_tld: process.env.NODE_ENV === 'production',
      host_blacklist: ['localhost', '127.0.0.1', '::1']
    });
  }

  defaultMessage() {
    return 'The URL must be a valid HTTP/HTTPS URL pointing to a public calendar feed';
  }
}

export function IsCalendarUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCalendarUrlConstraint,
    });
  };
}