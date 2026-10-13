import { useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import styles from './Tabs.module.css'

export interface TabItem {
  id: string
  label: string
  content: ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  /** Names the tab list for screen readers, for example t('admin.moderation.tabs'). */
  label: string
  defaultTab?: string
  onChange?: (id: string) => void
}

export default function Tabs({ tabs, label, defaultTab, onChange }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTab ?? tabs[0]?.id)
  const baseId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  function select(index: number) {
    const tab = tabs[index]
    if (!tab) return
    setActiveId(tab.id)
    onChange?.(tab.id)
    buttons.current[index]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight') select((index + 1) % tabs.length)
    else if (event.key === 'ArrowLeft') select((index - 1 + tabs.length) % tabs.length)
    else if (event.key === 'Home') select(0)
    else if (event.key === 'End') select(tabs.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className={styles.list}>
        {tabs.map((tab, index) => {
          const selected = tab.id === active?.id
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[index] = element
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={selected ? `${baseId}-panel` : undefined}
              tabIndex={selected ? 0 : -1}
              className={selected ? `${styles.tab} ${styles.selected}` : styles.tab}
              onClick={() => select(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active.id}`}
          tabIndex={0}
          className={styles.panel}
        >
          {active.content}
        </div>
      )}
    </div>
  )
}