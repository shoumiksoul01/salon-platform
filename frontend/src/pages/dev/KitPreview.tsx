import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  FormField,
  Input,
  Modal,
  Select,
  useToast,
} from '../../components/ui'
import KitPreviewData from './KitPreviewData'

export default function KitPreview() {
  const [name, setName] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const toast = useToast()
  const showError = name.length > 0 && name.length < 3

  return (
    <div
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

      <FormField
        label="Full name"
        hint="At least 3 characters."
        error={showError ? 'Name is too short.' : undefined}
        required
      >
        {(control) => (
          <Input
            {...control}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type here"
          />
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

      <h2>Badges</h2>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <Badge>Neutral</Badge>
        <Badge variant="primary">Featured</Badge>
        <Badge variant="success">Confirmed</Badge>
        <Badge variant="warning">Pending</Badge>
        <Badge variant="danger">Cancelled</Badge>
        <Badge variant="info">New</Badge>
      </section>

      <h2>Cards</h2>
      <Card>
        <h3 style={{ margin: 0 }}>Plain card</h3>
        <p>Used for panels and form sections.</p>
      </Card>
      <Card interactive>
        <h3 style={{ margin: 0 }}>Interactive card</h3>
        <p>Hover to see the shadow. Use it for shop cards that link somewhere.</p>
        <Badge variant="success">Open now</Badge>
      </Card>

      <h2>Modal and toast</h2>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Button
          variant="secondary"
          onClick={() => toast.show({ message: 'Booking confirmed.', variant: 'success' })}
        >
          Success toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.show({ message: 'Payment failed. Try again.', variant: 'danger' })}
        >
          Danger toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.show({ message: 'Stays until dismissed.', duration: 0 })}
        >
          Sticky toast
        </Button>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cancel booking?"
        closeLabel="Close"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setModalOpen(false)
                toast.show({ message: 'Booking cancelled.', variant: 'warning' })
              }}
            >
              Cancel booking
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>You can book again later, but the slot may be taken.</p>
      </Modal>

      <KitPreviewData />
    </div>
  )
}