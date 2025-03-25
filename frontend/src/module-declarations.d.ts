declare module 'three/src/loaders/TextureLoader' {
  export * from 'three';
}

declare module '@react-three/fiber' {
  import { Camera, Object3D, Scene, WebGLRenderer } from 'three';
  import { ReactNode } from 'react';

  export type RootState = {
    gl: WebGLRenderer;
    scene: Scene;
    camera: Camera;
    // Add other properties as needed
  };

  export type ThreeEvent<T> = T & {
    object: Object3D;
    // Add other properties as needed
  };

  export type Subscription = {
    ref: Object3D;
    // Add other properties as needed
  };

  // ReactThreeFiber namespace for JSX types
  export namespace ReactThreeFiber {
    export type Object3DNode<T, P> = P & {
      position?: [number, number, number] | number[];
      // Add other properties as needed
    };
    
    export type MaterialNode<T, P> = P & {
      color?: string | number;
      // Add other properties as needed
    };
    
    export type BufferGeometryNode<T, P> = P & {
      args?: any[];
      // Add other properties as needed
    };
    
    export type LightNode<T, P> = P & {
      intensity?: number;
      // Add other properties as needed
    };
  }

  export function Canvas(props: any): JSX.Element;
  export function useFrame(callback: (state: RootState, delta: number) => void, priority?: number): void;
  export function useLoader<T>(loader: any, url: string | string[]): T;
}

declare module '@react-three/drei' {
  export function OrbitControls(props: any): JSX.Element;
  export function useTexture(url: string | string[]): any;
  export function Html(props: {
    position?: [number, number, number];
    style?: React.CSSProperties;
    className?: string;
    prepend?: boolean;
    center?: boolean;
    fullscreen?: boolean;
    zIndexRange?: [number, number];
    distanceFactor?: number;
    sprite?: boolean;
    transform?: boolean;
    portal?: React.MutableRefObject<HTMLElement>;
    calculatePosition?: (el: Object3D, camera: Camera, size: { width: number, height: number }) => number[];
    as?: React.ElementType;
    wrapperClass?: string;
    pointerEvents?: 'auto' | 'none' | 'visiblePainted' | 'visibleFill' | 'visibleStroke' | 'visible' | 'painted' | 'fill' | 'stroke' | 'all' | 'inherit';
    occlude?: React.RefObject<Object3D>[];
    onOcclude?: (visible: boolean) => void;
    [key: string]: any;
  }): JSX.Element;
} 