// Minimal Jest type stubs to satisfy TS in absence of @types/jest install
declare const jest: any;
declare function describe(name: string, fn: () => void | Promise<void>): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function expect(actual: any): any;







