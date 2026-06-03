import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import * as xss from 'xss';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (value && typeof value === 'object') {
      return this.sanitizeObject(value);
    }
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    return value;
  }

  private sanitizeObject(obj: any): any {
    const sanitizedObj: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          sanitizedObj[key] = this.sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizedObj[key] = this.sanitizeObject(obj[key]);
        } else {
          sanitizedObj[key] = obj[key];
        }
      }
    }
    return sanitizedObj;
  }

  private sanitizeString(str: string): string {
    // Basic sanitization
    let sanitized = str.trim();

    // If the xss library is loaded, use it. Otherwise, simple basic replacement.
    if (
      typeof xss === 'function' ||
      (xss && typeof xss.filterXSS === 'function')
    ) {
      const filterXSS = typeof xss === 'function' ? xss : xss.filterXSS;
      sanitized = filterXSS(sanitized);
    } else {
      // Fallback basic sanitization
      sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    return sanitized;
  }
}
