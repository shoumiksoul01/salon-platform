import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
  useToast,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { StaffError, createStaff, listStaff, normaliseStaffPhone, setStaffActive, updateStaff } from '../../api/staff'
import type { OwnerStaff, StaffInput } from '../../api/staff'
import { listServices } from '../../api/services'
import type { Service } from '../../api/services'
import styles from './StaffPage.module.css'

// OWN-05: staff and availability (FR-01.5). UI-SM-19: the staff list, the add and edit
// dialog with service assignment, activate and deactivate.
// UI-SM-20 adds the working hours, breaks and blocked time of each staff member.

const PHONE_PATTERN = /^01[3-9]\d{8}$/
const NAME_MIN = 2
const NAME_MAX = 60
const ROLE_MIN = 2
const ROLE_MAX = 40
const SERVICES_SHOWN = 3
const FORM_ID = 'staff-form'

// Bengali digits are turned into 0-9, so an owner can type either way.
const toAsciiDigits = (value: string) =>
  value.replace(/[\u09E6-\u09EF]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6)).trim()

function useNumber() {
  const { i18n } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')
  return (value: number) => format.format(value)
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      {[1, 2, 3].map((n) => (
        <Card key={n}>
          <Skeleton width="50%" />
          <Skeleton width="30%" />
        </Card>
      ))}
    </div>
  )
}

interface DialogProps {
  /** The staff member being edited, or null to add a new one. */
  member: OwnerStaff | null
  services: Service[]
  onClose: () => void
  onSaved: (member: OwnerStaff, isNew: boolean) => void
}

function StaffDialog({ member, services, onClose, onSaved }: DialogProps) {
  const { t } = useTranslation('ownerStaff')
  const toast = useToast()
  const [fullName, setFullName] = useState(member?.full_name ?? '')
  const [phone, setPhone] = useState(member?.phone ?? '')
  const [roleTitle, setRoleTitle] = useState(member?.role_title ?? '')
  const [serviceIds, setServiceIds] = useState<string[]>(member?.service_ids ?? [])
  const [errors, setErrors] = useState<Partial<Record<'name' | 'phone' | 'role' | 'services', string>>>({})
  const [saving, setSaving] = useState(false)

  // Active services can be picked. A service the person already does stays in the list.
  const choices = services.filter((service) => service.is_active || serviceIds.includes(service.id))

  function toggleService(id: string, checked: boolean) {
    setServiceIds((previous) => (checked ? [...previous, id] : previous.filter((item) => item !== id)))
    setErrors((previous) => ({ ...previous, services: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanName = fullName.trim()
    const cleanRole = roleTitle.trim()
    const cleanPhone = normaliseStaffPhone(toAsciiDigits(phone))
    const found: typeof errors = {}

    if (cleanName.length < NAME_MIN || cleanName.length > NAME_MAX) {
      found.name = t('form.nameInvalid', { min: NAME_MIN, max: NAME_MAX })
    }
    if (!cleanPhone) found.phone = t('form.phoneRequired')
    else if (!PHONE_PATTERN.test(cleanPhone)) found.phone = t('form.phoneInvalid')
    if (cleanRole.length < ROLE_MIN || cleanRole.length > ROLE_MAX) {
      found.role = t('form.roleInvalid', { min: ROLE_MIN, max: ROLE_MAX })
    }
    if (serviceIds.length === 0) found.services = t('form.servicesRequired')

    setErrors(found)
    if (Object.keys(found).length > 0) return

    const input: StaffInput = {
      full_name: cleanName,
      phone: cleanPhone,
      role_title: cleanRole,
      service_ids: serviceIds,
    }

    setSaving(true)
    try {
      const saved = member ? await updateStaff(member.id, input) : await createStaff(input)
      toast.show({ message: t(member ? 'toast.updated' : 'toast.created'), variant: 'success' })
      onSaved(saved, member === null)
    } catch (error) {
      setSaving(false)
      if (error instanceof StaffError && error.code === 'phone_taken') {
        setErrors({ phone: t('form.phoneTaken') })
      } else {
        toast.show({ message: t('toast.saveFailed'), variant: 'danger' })
      }
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t(member ? 'form.editTitle' : 'form.addTitle')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            {t('common:actions.save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormField label={t('form.name')} error={errors.name} required>
          {(control) => (
            <Input
              {...control}
              value={fullName}
              maxLength={NAME_MAX}
              autoComplete="off"
              onChange={(event) => setFullName(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          label={t('form.phone')}
          hint={t(member ? 'form.phoneHintEdit' : 'form.phoneHintNew')}
          error={errors.phone}
          required
        >
          {(control) => (
            <Input
              {...control}
              type="tel"
              inputMode="tel"
              value={phone}
              autoComplete="off"
              onChange={(event) => setPhone(event.target.value)}
            />
          )}
        </FormField>

        <FormField label={t('form.role')} hint={t('form.roleHint')} error={errors.role} required>
          {(control) => (
            <Input
              {...control}
              value={roleTitle}
              maxLength={ROLE_MAX}
              autoComplete="off"
              onChange={(event) => setRoleTitle(event.target.value)}
            />
          )}
        </FormField>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>
            {t('form.services')}
            <span aria-hidden="true"> *</span>
          </legend>
          <p className={styles.muted}>{t('form.servicesHint')}</p>
          {choices.length === 0 ? (
            <p className={styles.muted}>{t('form.noServices')}</p>
          ) : (
            <div className={styles.checks}>
              {choices.map((service) => (
                <Checkbox
                  key={service.id}
                  label={
                    <>
                      {service.name}
                      {!service.is_active && (
                        <span className={styles.muted}>{` · ${t('form.inactiveService')}`}</span>
                      )}
                    </>
                  }
                  checked={serviceIds.includes(service.id)}
                  onChange={(event) => toggleService(service.id, event.target.checked)}
                />
              ))}
            </div>
          )}
          {errors.services && (
            <p className={styles.error} role="alert">
              {errors.services}
            </p>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}

type DialogState = { member: OwnerStaff | null } | null

interface PageData {
  staff: OwnerStaff[]
  services: Service[]
}

// Declared outside the component, so useAsync gets a stable function.
async function loadPage(): Promise<PageData> {
  const [staff, services] = await Promise.all([listStaff(), listServices()])
  return { staff, services }
}

function Content({ initial }: { initial: PageData }) {
  const { t } = useTranslation('ownerStaff')
  const toast = useToast()
  const formatNumber = useNumber()
  const [list, setList] = useState(initial.staff)
  const services = initial.services
  const [showInactive, setShowInactive] = useState(true)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [deactivating, setDeactivating] = useState<OwnerStaff | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const serviceNames = new Map(services.map((service) => [service.id, service.name]))
  const hasActiveService = services.some((service) => service.is_active)
  const activeCount = list.filter((member) => member.is_active).length
  const inactiveCount = list.length - activeCount
  const shown = showInactive ? list : list.filter((member) => member.is_active)

  function handleSaved(saved: OwnerStaff, isNew: boolean) {
    setList((previous) =>
      isNew ? [saved, ...previous] : previous.map((item) => (item.id === saved.id ? saved : item)),
    )
    setDialog(null)
  }

  async function changeActive(member: OwnerStaff, isActive: boolean) {
    setBusyId(member.id)
    try {
      const saved = await setStaffActive(member.id, isActive)
      setList((previous) => previous.map((item) => (item.id === saved.id ? saved : item)))
      toast.show({
        message: t(isActive ? 'toast.activated' : 'toast.deactivated', { name: saved.full_name }),
        variant: 'success',
      })
      setDeactivating(null)
    } catch {
      toast.show({ message: t('toast.saveFailed'), variant: 'danger' })
    } finally {
      setBusyId(null)
    }
  }

  function servicesLine(member: OwnerStaff) {
    const names = member.service_ids
      .map((id) => serviceNames.get(id))
      .filter((name): name is string => Boolean(name))
    const first = names.slice(0, SERVICES_SHOWN).join(', ')
    const more = names.length - SERVICES_SHOWN
    return more > 0
      ? t('servicesMore', { names: first, number: formatNumber(more) })
      : t('servicesLine', { names: first })
  }

  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        <Button onClick={() => setDialog({ member: null })} disabled={!hasActiveService}>
          {t('add')}
        </Button>
      </div>
      <p className={styles.muted}>{t('intro')}</p>
      {!hasActiveService && <p className={styles.muted}>{t('needServices')}</p>}

      {list.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyText')} />
      ) : (
        <>
          <div className={styles.toolbar}>
            <p className={styles.muted} role="status">
              {t('counts', { active: formatNumber(activeCount), inactive: formatNumber(inactiveCount) })}
            </p>
            {inactiveCount > 0 && (
              <Checkbox
                label={t('showInactive')}
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
              />
            )}
          </div>

          {shown.length === 0 ? (
            <EmptyState title={t('noneShownTitle')} description={t('noneShownText')} />
          ) : (
            <ul className={styles.list}>
              {shown.map((member) => (
                <li key={member.id}>
                  <Card className={member.is_active ? '' : styles.inactive}>
                    <div className={styles.row}>
                      <div className={styles.details}>
                        <p className={styles.name}>{member.full_name}</p>
                        <div className={styles.badges}>
                          <Badge variant="neutral">{member.role_title}</Badge>
                          {!member.is_active && <Badge variant="warning">{t('inactive')}</Badge>}
                        </div>
                        <p className={styles.muted}>
                          <a href={`tel:${member.phone}`}>{member.phone}</a>
                        </p>
                        <p className={styles.muted}>{servicesLine(member)}</p>
                        {member.upcoming_count > 0 && (
                          <p className={styles.muted}>
                            {t('upcoming', { number: formatNumber(member.upcoming_count) })}
                          </p>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          onClick={() => setDialog({ member })}
                          aria-label={t('editLabel', { name: member.full_name })}
                        >
                          {t('edit')}
                        </Button>
                        {member.is_active ? (
                          <Button
                            variant="ghost"
                            onClick={() => setDeactivating(member)}
                            aria-label={t('deactivateLabel', { name: member.full_name })}
                          >
                            {t('deactivate')}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            loading={busyId === member.id}
                            onClick={() => changeActive(member, true)}
                            aria-label={t('activateLabel', { name: member.full_name })}
                          >
                            {t('activate')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.muted}>{t('deactivateNote')}</p>
        </>
      )}

      {dialog && (
        <StaffDialog
          key={dialog.member?.id ?? 'new'}
          member={dialog.member}
          services={services}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      <Modal
        open={deactivating !== null}
        onClose={() => setDeactivating(null)}
        title={t('deactivateDialog.title')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeactivating(null)} disabled={busyId !== null}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={busyId !== null}
              onClick={() => deactivating && changeActive(deactivating, false)}
            >
              {t('deactivateDialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('deactivateDialog.text', { name: deactivating?.full_name ?? '' })}</p>
        {deactivating && deactivating.upcoming_count > 0 && (
          <p>{t('deactivateDialog.upcoming', { number: formatNumber(deactivating.upcoming_count) })}</p>
        )}
      </Modal>
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function StaffPage() {
  const { t } = useTranslation('ownerStaff')
  const { state, retry } = useAsync(loadPage)

  return (
    <div className={styles.page}>
      {state.status === 'loading' && <Loading label={t('loading')} />}
      {state.status === 'error' && (
        <EmptyState
          title={t('common:states.error')}
          action={<Button onClick={retry}>{t('common:actions.retry')}</Button>}
        />
      )}
      {state.status === 'ready' && <Content initial={state.data} />}
    </div>
  )
}
