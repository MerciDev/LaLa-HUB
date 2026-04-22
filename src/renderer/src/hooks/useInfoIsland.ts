import { useState, useEffect } from 'react'

/**
 * Custom hook that manages the dynamic text / width of the Info Island
 * with a cross-fade animation on text change.
 */
export function useInfoIsland() {
    const [infoText, setInfoText] = useState('')
    const [displayText, setDisplayText] = useState('')
    const [islandWidth, setIslandWidth] = useState<string>('56px')
    const [textOpacity, setTextOpacity] = useState<number>(1)

    useEffect(() => {
        if (infoText === displayText) return

        setTextOpacity(0)
        const timeout = setTimeout(() => {
            setDisplayText(infoText)
            setTextOpacity(1)
        }, 300)

        return () => clearTimeout(timeout)
    }, [infoText, displayText])

    const expand = (text: string) => {
        setInfoText(text)
        setIslandWidth('50%')
    }

    const collapse = () => {
        setInfoText('')
        setIslandWidth('56px')
    }

    return {
        displayText,
        islandWidth,
        textOpacity,
        setInfoText,
        setIslandWidth,
        expand,
        collapse
    }
}
