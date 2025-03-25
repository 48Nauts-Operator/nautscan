declare module 'vis-network' {
  export class Network {
    constructor(
      container: HTMLElement,
      data: { nodes: any; edges: any },
      options?: any
    );
    setData(data: { nodes: any; edges: any }): void;
    fit(): void;
    destroy(): void;
  }
}

declare module 'vis-data' {
  export class DataSet<T = any> {
    constructor(data?: T[]);
    add(data: T | T[]): void;
    remove(data: T | T[]): void;
    clear(): void;
  }
} 