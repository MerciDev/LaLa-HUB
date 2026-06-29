import { AuthState, AuthResult, HomeSlot, InterfaceSettings, UserProfile } from '../../../../shared/types'

export interface ProfilePageProps {
    visible: boolean
    initialTab?: string
    authState: AuthState
    onLogin: (result: AuthResult) => void
    onClose: () => void
    onOpenAddGame?: (editSlot?: HomeSlot) => void
}

export interface TabSharedProps {
    focusArea: string
    selectedIndex: number
    isFocused: (area: string, idx: number) => boolean
    user: UserProfile | null
    loading: boolean
    error: string | null
}
