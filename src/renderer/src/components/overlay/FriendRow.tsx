import { FriendProfile } from '../../../../shared/types'

interface FriendRowProps {
  friend: FriendProfile | any
  focused: boolean
  onAccept?: (id: string) => void
}

function FriendRow({ friend, focused, onAccept }: FriendRowProps) {
  const name = friend.username || friend.name || 'Usuario'
  const initials = name.charAt(0).toUpperCase()
  const isPending = friend.friendshipStatus === 'pending'
  const isSender = friend.isSender

  return (
    <div className={`ov-friend-row${focused ? ' focused' : ''}`}>
      <div className={`ov-friend-row__avatar ov-friend-row__avatar--${friend.status || 'offline'}`}>
        {friend.avatarUrl ? (
          <img src={friend.avatarUrl} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          initials
        )}
      </div>
      <div className="ov-friend-row__info">
        <div className="ov-friend-row__name">{name}</div>
        <div className="ov-friend-row__status">
          {isPending ? (isSender ? 'Solicitud enviada' : 'Solicitud pendiente') : friend.statusText}
        </div>
      </div>
      <div className={`ov-dot ov-dot--${friend.status || 'offline'}`} />
      
      {isPending && !isSender && (
        <button 
          className="ov-btn ov-btn--primary" 
          style={{ fontSize: 11, padding: '4px 10px' }}
          onClick={(e) => {
            e.stopPropagation()
            onAccept?.(friend.id)
          }}
        >
          Aceptar
        </button>
      )}

      {!isPending && friend.status === 'online' && (
        <button className="ov-btn ov-btn--ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
          Unirse
        </button>
      )}
    </div>
  )
}

export default FriendRow
