import React from 'react';
import {
  Heading as PrimerHeading,
  Text as PrimerText,
  Flash as PrimerFlash,
  Banner as PrimerBanner,
  type BannerProps,
} from '@primer/react';
import { Box } from './Box';
import { resolveSx, SxProp } from './resolveSx';

export { Box, PrimerBanner as Banner, type BannerProps };

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  variant?: 'large' | 'medium' | 'small';
  sx?: SxProp;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({ as = 'h2', sx, style, children, ...props }) => {
  const mergedStyle = { ...resolveSx(sx), ...style };
  return (
    <PrimerHeading as={as} style={mergedStyle} {...props}>
      {children}
    </PrimerHeading>
  );
};

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: React.ElementType;
  size?: 'large' | 'medium' | 'small';
  weight?: 'light' | 'normal' | 'medium' | 'semibold';
  sx?: SxProp;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  as: Component = 'span',
  sx,
  style,
  children,
  ...props
}) => {
  const mergedStyle = { ...resolveSx(sx), ...style };
  return (
    <PrimerText as={Component} style={mergedStyle} {...props}>
      {children}
    </PrimerText>
  );
};

export interface FlashProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'warning' | 'success' | 'danger';
  full?: boolean;
  leadingVisual?: React.ElementType;
  sx?: SxProp;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Flash: React.FC<FlashProps> = ({
  variant = 'default',
  leadingVisual: LeadingVisual,
  sx,
  style,
  children,
  ...props
}) => {
  const resolved = resolveSx(sx);
  const mergedStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    ...resolved,
    ...style,
  };
  return (
    <PrimerFlash variant={variant} style={mergedStyle} {...props}>
      {LeadingVisual && <LeadingVisual size={16} />}
      {children}
    </PrimerFlash>
  );
};
