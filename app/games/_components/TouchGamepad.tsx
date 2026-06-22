'use client'

type GamepadButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b'

type GamepadMapping = {
  used: GamepadButton[]
  labels?: Partial<Record<'a' | 'b', string>>
}

type TouchGamepadProps = {
  onInput: (button: GamepadButton, pressed: boolean) => void
  mapping: GamepadMapping
}

function GamepadBtn({
  button,
  label,
  disabled,
  onInput,
  className = '',
}: {
  button: GamepadButton
  label: string
  disabled: boolean
  onInput: (button: GamepadButton, pressed: boolean) => void
  className?: string
}) {
  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    if (disabled) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onInput(button, true)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (disabled) return
    onInput(button, false)
  }

  function handlePointerLeave(e: React.PointerEvent) {
    if (disabled) return
    onInput(button, false)
  }

  function handlePointerCancel(e: React.PointerEvent) {
    if (disabled) return
    onInput(button, false)
  }

  return (
    <button
      className={`gamepad-btn${disabled ? ' gamepad-btn--disabled' : ''} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      aria-label={label}
      aria-disabled={disabled}
    >
      {label}
    </button>
  )
}

export default function TouchGamepad({ onInput, mapping }: TouchGamepadProps) {
  const used = new Set(mapping.used)
  const labelA = mapping.labels?.a ?? 'A'
  const labelB = mapping.labels?.b ?? 'B'

  return (
    <div className="touch-gamepad">
      {/* D-pad */}
      <div className="gamepad-dpad">
        <div className="gamepad-dpad__row">
          <GamepadBtn button="up" label="▲" disabled={!used.has('up')} onInput={onInput} className="gamepad-dpad__up" />
        </div>
        <div className="gamepad-dpad__row">
          <GamepadBtn button="left" label="◀" disabled={!used.has('left')} onInput={onInput} className="gamepad-dpad__left" />
          <div className="gamepad-dpad__center" />
          <GamepadBtn button="right" label="▶" disabled={!used.has('right')} onInput={onInput} className="gamepad-dpad__right" />
        </div>
        <div className="gamepad-dpad__row">
          <GamepadBtn button="down" label="▼" disabled={!used.has('down')} onInput={onInput} className="gamepad-dpad__down" />
        </div>
      </div>

      {/* Botones A/B */}
      <div className="gamepad-actions">
        <GamepadBtn button="b" label={labelB} disabled={!used.has('b')} onInput={onInput} className="gamepad-actions__b" />
        <GamepadBtn button="a" label={labelA} disabled={!used.has('a')} onInput={onInput} className="gamepad-actions__a" />
      </div>
    </div>
  )
}
