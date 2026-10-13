import styles from './Skeleton.module.css'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  /** Round shape. Give width and height the same value. */
  circle?: boolean
  className?: string
}

/** A grey placeholder shown while data loads. Set aria-busy on the loading container. */
export default function Skeleton({
  width = '100%',
  height = '1rem',
  circle = false,
  className,
}: SkeletonProps) {
  const classes = [styles.skeleton, circle ? styles.circle : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return <span className={classes} style={{ width, height }} aria-hidden="true" />
}