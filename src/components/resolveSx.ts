import React from 'react';

export type SxProp = Record<string, unknown>;

const SPACING_MAP: Record<number, string> = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '16px',
  4: '24px',
  5: '32px',
  6: '40px',
};

const COLOR_MAP: Record<string, string> = {
  'canvas.default': 'var(--bgColor-default, #ffffff)',
  'canvas.subtle': 'var(--bgColor-muted, #f6f8fa)',
  'fg.default': 'var(--fgColor-default, #1f2328)',
  'fg.muted': 'var(--fgColor-muted, #656d76)',
  'fg.subtle': 'var(--fgColor-subtle, #8c959f)',
  'border.default': 'var(--borderColor-default, #d0d7de)',
  'border.muted': 'var(--borderColor-muted, #d8dee4)',
  'accent.fg': 'var(--fgColor-accent, #0969da)',
  'accent.emphasis': 'var(--bgColor-accent-emphasis, #0969da)',
  'accent.subtle': 'var(--bgColor-accent-muted, #ddf4ff)',
  'danger.fg': 'var(--fgColor-danger, #cf222e)',
  'danger.emphasis': 'var(--bgColor-danger-emphasis, #cf222e)',
  'neutral.emphasis': 'var(--bgColor-neutral-emphasis, #6e7781)',
  'neutral.subtle': 'var(--bgColor-neutral-muted, #eaeef2)',
};

export function resolveSx(sx?: SxProp): React.CSSProperties {
  if (!sx) return {};

  const style: Record<string, unknown> = {};

  for (const [key, rawVal] of Object.entries(sx)) {
    const val = Array.isArray(rawVal) ? rawVal[rawVal.length - 1] : rawVal;

    switch (key) {
      case 'p':
        style.padding = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'px': {
        const p = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        style.paddingLeft = p;
        style.paddingRight = p;
        break;
      }
      case 'py': {
        const p = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        style.paddingTop = p;
        style.paddingBottom = p;
        break;
      }
      case 'pt':
        style.paddingTop = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'pb':
        style.paddingBottom = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'pl':
        style.paddingLeft = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'pr':
        style.paddingRight = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;

      case 'm':
        style.margin = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'mx': {
        const m = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        style.marginLeft = m;
        style.marginRight = m;
        break;
      }
      case 'my': {
        const m = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        style.marginTop = m;
        style.marginBottom = m;
        break;
      }
      case 'mt':
        style.marginTop = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'mb':
        style.marginBottom = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'ml':
        style.marginLeft = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;
      case 'mr':
        style.marginRight = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;

      case 'bg':
        style.backgroundColor = typeof val === 'string' && COLOR_MAP[val] ? COLOR_MAP[val] : val;
        break;
      case 'color':
        style.color = typeof val === 'string' && COLOR_MAP[val] ? COLOR_MAP[val] : val;
        break;
      case 'borderColor':
        style.borderColor = typeof val === 'string' && COLOR_MAP[val] ? COLOR_MAP[val] : val;
        break;

      case 'borderRadius':
        style.borderRadius =
          val === 1
            ? '4px'
            : val === 2
              ? '6px'
              : val === 3
                ? '8px'
                : typeof val === 'number'
                  ? `${val * 4}px`
                  : val;
        break;

      case 'gap':
        style.gap = typeof val === 'number' ? SPACING_MAP[val] || `${val * 4}px` : val;
        break;

      case 'fontSize':
        style.fontSize =
          val === 0
            ? '12px'
            : val === 1
              ? '14px'
              : val === 2
                ? '16px'
                : val === 3
                  ? '20px'
                  : val === 4
                    ? '24px'
                    : val;
        break;

      case 'boxShadow':
        style.boxShadow =
          val === 'shadow.small'
            ? '0 1px 3px rgba(31, 35, 40, 0.12)'
            : val === 'shadow.medium'
              ? '0 3px 6px rgba(31, 35, 40, 0.15)'
              : val;
        break;

      default:
        if (typeof key === 'string' && !key.startsWith(':')) {
          style[key] = val;
        }
        break;
    }
  }

  return style as React.CSSProperties;
}
