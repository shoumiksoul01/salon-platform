import type { ElementType, HTMLAttributes } from 'react'
import styles from './Card.module.css'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'section' | 'li'
  /** Default true. Turn off for cards whose content (an image, say) touches the edges. */
  padded?: boolean
  /** Adds a hover shadow. Use for cards that are wrapped in a link. */
  interactive?: boolean
}

export default function Card({
  as = 'div',
  padded = true,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const Tag: ElementType = as
  const classes = [
    styles.card,
    padded ? styles.padded : '',
    interactive ? styles.interactive : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}