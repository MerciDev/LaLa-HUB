import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { FriendProfile } from '../../../../shared/types'
import FriendRow from './FriendRow'

interface PanelSocialProps {
  inPanel: boolean
  panelIdx: number
}

function PanelSocial({ inPanel, panelIdx }: PanelSocialProps) {
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const loadFriends = async () => {
    try {
      const res = await window.api.social.getFriends()
      if (res?.success && res.data) {
        setFriends(res.data)
      }
    } catch { }
  }

  useEffect(() => {
    loadFriends()

    const unsub = window.api.social.onPresenceUpdate(() => {
      loadFriends()
    })

    return () => { unsub() }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const res = await window.api.social.searchUsers(searchQuery)
    if (res?.success && res.data) {
      setSearchResults(res.data)
    }
  }

  const handleSendRequest = async (id: string) => {
    await window.api.social.sendRequest(id)
    setSearchResults(prev => prev.filter(u => u.id !== id))
    loadFriends()
  }

  const handleAcceptRequest = async (id: string) => {
    await window.api.social.acceptRequest(id)
    loadFriends()
  }

  const pending = friends.filter(f => f.friendshipStatus === 'pending')
  const online  = friends.filter(f => f.friendshipStatus === 'accepted' && f.status !== 'offline')
  const offline = friends.filter(f => f.friendshipStatus === 'accepted' && f.status === 'offline')

  return (
    <>
      <div className="ov-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon icon="mynaui:users" className="ov-panel__icon" />
          <div className="ov-panel__title">Amigos</div>
          <span className="ov-panel__badge">{online.length} en línea</span>
        </div>
        <button 
          className="ov-btn ov-btn--ghost" 
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={() => setIsSearching(!isSearching)}
        >
          <Icon icon={isSearching ? "mynaui:x" : "mynaui:plus"} />
          <span>{isSearching ? 'Cerrar' : 'Añadir'}</span>
        </button>
      </div>

      <div className="ov-panel__body">
        {isSearching ? (
          <div style={{ padding: '10px 0' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input 
                type="text" 
                placeholder="Buscar por usuario..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none'
                }}
              />
              <button type="submit" className="ov-btn ov-btn--primary" style={{ padding: '0 16px' }}>
                Buscar
              </button>
            </form>

            <div className="ov-section-label">Resultados</div>
            {searchResults.length === 0 && (
              <div style={{ opacity: 0.5, fontSize: 13, padding: '8px 0' }}>No se encontraron usuarios</div>
            )}
            {searchResults.map(u => (
              <div key={u.id} className="ov-friend-row" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="ov-friend-row__avatar ov-friend-row__avatar--offline">
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="ov-friend-row__name">{u.username}</div>
                </div>
                <button 
                  className="ov-btn ov-btn--ghost" 
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() => handleSendRequest(u.id)}
                >
                  Invitar
                </button>
              </div>
            ))}
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <div className="ov-section-label" style={{ color: 'var(--accent)' }}>Solicitudes pendientes</div>
                {pending.map((f, i) => (
                  <FriendRow key={f.id} friend={f} focused={inPanel && panelIdx === i} onAccept={handleAcceptRequest} />
                ))}
              </>
            )}

            {online.length > 0 && (
              <>
                <div className="ov-section-label">En línea</div>
                {online.map((f, i) => (
                  <FriendRow key={f.id} friend={f} focused={inPanel && panelIdx === pending.length + i} />
                ))}
              </>
            )}

            {offline.length > 0 && (
              <>
                <div className="ov-section-label">Sin conexión</div>
                {offline.map((f, i) => (
                  <FriendRow key={f.id} friend={f} focused={inPanel && panelIdx === pending.length + online.length + i} />
                ))}
              </>
            )}

            {pending.length === 0 && online.length === 0 && offline.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center', opacity: 0.5, fontSize: 13 }}>
                No tienes amigos agregados aún. ¡Pulsa "Añadir" arriba!
              </div>
            )}
          </>
        )}

        <div className="ov-hints">
          <span className="ov-hint"><span className="ov-hint__key">↑↓</span> Navegar</span>
          <span className="ov-hint"><span className="ov-hint__key">↵</span> Seleccionar</span>
        </div>
      </div>
    </>
  )
}

export default PanelSocial
