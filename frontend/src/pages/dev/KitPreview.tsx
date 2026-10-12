import { useState } from 'react'
import { Button, Checkbox, FormField, Input, Select } from '../../components/ui'

export default function KitPreview() {
  const [name, setName] = useState('')
  const showError = name.length > 0 && name.length < 3

  return (
    <main
      style={{
        maxWidth: '32rem',
        margin: '0 auto',
        padding: 'var(--space-6) var(--container-padding)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        textAlign: 'start',
      }}
    >
      <h1>UI kit preview</h1>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </section>

      <Button fullWidth>Full width button</Button>

      <FormField label="Full name" hint="At least 3 characters." error={showError ? 'Name is too short.' : undefined} required>
        {(control) => (
          <Input {...control} value={name} onChange={(e) => setName(e.target.value)} placeholder="Type here" />
        )}
      </FormField>

      <FormField label="Phone">
        {(control) => <Input {...control} type="tel" placeholder="01XXXXXXXXX" />}
      </FormField>

      <FormField label="Area">
        {(control) => (
          <Select {...control} placeholder="Choose an area" defaultValue="">
            <option value="gulshan">Gulshan</option>
            <option value="dhanmondi">Dhanmondi</option>
            <option value="uttara">Uttara</option>
          </Select>
        )}
      </FormField>

      <FormField label="Disabled input">
        {(control) => <Input {...control} disabled value="Cannot edit" readOnly />}
      </FormField>

      <Checkbox label="I agree to the terms" />
      <Checkbox label="Disabled option" disabled />
    </main>
  )
}