import React from 'react';
import { resolveSx, SxProp } from './resolveSx';

export interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  sx?: SxProp;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Box: React.FC<BoxProps> = ({
  as: Component = 'div',
  sx,
  style,
  children,
  ...props
}) => {
  const computedStyle = {
    ...resolveSx(sx),
    ...style,
  };

  return (
    <Component style={computedStyle} {...props}>
      {children}
    </Component>
  );
};
