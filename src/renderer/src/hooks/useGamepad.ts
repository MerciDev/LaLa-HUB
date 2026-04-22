import { useEffect, useRef } from 'react'

export function useGamepad(): void {
    const requestRef = useRef<number | null>(null)
    // Map controller index -> boolean array of button states (including virtual axis buttons)
    const prevButtonsRef = useRef<{ [key: number]: boolean[] }>({})

    // Standard Gamepad Mapping (x-input style)
    const getButtonMapping = (index: number): string | null => {
        switch (index) {
            case 0: return 'A'
            case 1: return 'B'
            case 2: return 'X'
            case 3: return 'Y'
            case 4: return 'LB'
            case 5: return 'RB'
            case 6: return 'LT'
            case 7: return 'RT'
            case 8: return 'Select'
            case 9: return 'Start'
            case 10: return 'Left Stick'
            case 11: return 'Right Stick'
            case 12: return 'Up'
            case 13: return 'Down'
            case 14: return 'Left'
            case 15: return 'Right'
            // Virtual Axis Buttons
            case 20: return 'Left'
            case 21: return 'Right'
            case 22: return 'Up'
            case 23: return 'Down'
            default: return null
        }
    }

    const scanGamepads = (): void => {
        const gamepads = navigator.getGamepads()

        for (let i = 0; i < gamepads.length; i++) {
            const gp = gamepads[i]
            if (!gp) continue

            // Ensure storage exists
            if (!prevButtonsRef.current[i]) {
                prevButtonsRef.current[i] = []
            }
            const prevButtons = prevButtonsRef.current[i]

            // 1. Process Physical Buttons
            gp.buttons.forEach((button, btnIndex) => {
                const pressed = button.pressed
                const prevPressed = prevButtons[btnIndex] || false

                if (pressed && !prevPressed) {
                    console.log(`Gamepad [${i}] Button pressed:`, btnIndex)
                    const mapping = getButtonMapping(btnIndex)
                    if (mapping) {
                        window.api.gamepadControl.sendInput(mapping)
                    }
                }
                prevButtons[btnIndex] = pressed
            })

            // 2. Process Axes (Left Stick - Standard Indices 0 and 1)
            // Axis 0: Left (-1) to Right (1)
            // Axis 1: Up (-1) to Down (1)

            const AXIS_THRESHOLD = 0.5

            // Map Axes to Virtual Button Indices
            const axisMap = [
                { value: gp.axes[0], negIndex: 20, posIndex: 21 }, // Left/Right
                { value: gp.axes[1], negIndex: 22, posIndex: 23 }  // Up/Down
            ]

            axisMap.forEach(({ value, negIndex, posIndex }) => {
                // Negative Direction (Left / Up)
                const negPressed = value < -AXIS_THRESHOLD
                const prevNegPressed = prevButtons[negIndex] || false

                if (negPressed && !prevNegPressed) {
                    console.log(`Gamepad [${i}] Axis Negative pressed:`, negIndex)
                    const mapping = getButtonMapping(negIndex)
                    if (mapping) window.api.gamepadControl.sendInput(mapping)
                }
                prevButtons[negIndex] = negPressed

                // Positive Direction (Right / Down)
                const posPressed = value > AXIS_THRESHOLD
                const prevPosPressed = prevButtons[posIndex] || false

                if (posPressed && !prevPosPressed) {
                    console.log(`Gamepad [${i}] Axis Positive pressed:`, posIndex)
                    const mapping = getButtonMapping(posIndex)
                    if (mapping) window.api.gamepadControl.sendInput(mapping)
                }
                prevButtons[posIndex] = posPressed
            })
        }

        requestRef.current = requestAnimationFrame(scanGamepads)
    }

    useEffect(() => {
        requestRef.current = requestAnimationFrame(scanGamepads)
        return (): void => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current)
            }
        }
    }, [])
}
