declare module 'next/link' {
  import { ReactElement } from 'react';
  export default function Link(props: {
    href: string;
    as?: string;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    children: React.ReactNode;
    [key: string]: any;
  }): ReactElement;
}

declare module 'next/dynamic' {
  import { ComponentType } from 'react';

  export default function dynamic<P = {}>(
    dynamicOptions: {
      loader: () => Promise<ComponentType<P> | { default: ComponentType<P> }>;
      loading?: ComponentType<{ isLoading: boolean; error?: Error }>;
      ssr?: boolean;
      suspense?: boolean;
    },
    options?: {
      loadableGenerated?: {
        webpack?: any;
        modules?: any;
      };
      ssr?: boolean;
    }
  ): ComponentType<P>;
}

declare module 'next/router' {
  export interface NextRouter {
    pathname: string;
    query: Record<string, string | string[]>;
    asPath: string;
    push(url: string, as?: string, options?: any): Promise<boolean>;
    replace(url: string, as?: string, options?: any): Promise<boolean>;
    reload(): void;
    back(): void;
    prefetch(url: string): Promise<void>;
    beforePopState(cb: (state: any) => boolean): void;
    events: {
      on(type: string, handler: (...evts: any[]) => void): void;
      off(type: string, handler: (...evts: any[]) => void): void;
      emit(type: string, ...evts: any[]): void;
    };
    isFallback: boolean;
    isReady: boolean;
    isPreview: boolean;
  }

  export function useRouter(): NextRouter;
} 