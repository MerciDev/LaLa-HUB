import { Friend } from './types'

interface FriendRowProps {
  friend: Friend
  focused: boolean
}

function FriendRow({ friend, focused }: FriendRowProps) {
  return (
    <div className={`ov-friend-row${focused ? ' focused' : ''}`}>
      <div className={`ov-friend-row__avatar ov-friend-row__avatar--${friend.status}`}>
        {friend.initials}
      </div>
      <div className="ov-friend-row__info">
        <div className="ov-friend-row__name">{friend.name}</div>
        <div className="ov-friend-row__status">{friend.statusText}</div>
      </div>
      <div className={`ov-dot ov-dot--${friend.status}`} />
      {friend.status === 'online' && (
        <button className="ov-btn ov-btn--ghost" style={{ fontSize: 11, padding: '4px 10px' }}>
          Unirse
        </button>
      )}
    </div>
  )
}

export default FriendRow
