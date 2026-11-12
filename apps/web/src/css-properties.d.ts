import "react";

declare module "react" {
  // Lets components pass CSS custom properties through `style`.
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined;
  }
}
