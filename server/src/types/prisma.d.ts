/**
 * Type declarations for @prisma/client
 * This is a stub file for when Prisma is not installed
 */

declare module '@prisma/client' {
  export interface PrismaClient {
    [key: string]: any;
  }
  
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    [key: string]: any;
  }
  
  export default PrismaClient;
}
