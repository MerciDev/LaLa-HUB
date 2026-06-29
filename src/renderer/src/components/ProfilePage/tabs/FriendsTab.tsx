import React, { useState } from 'react'
import { Icon } from '@iconify/react'
import { FriendProfile, UserProfile } from '../../../../../shared/types'
import UserProfileModal from '../UserProfileModal'

interface FriendsTabProps {
    focusArea: string
    selectedIndex: number
    friendsList: FriendProfile[]
    friendSearchQuery: string
    friendSearchResults: UserProfile[]
    isSearchingFriends: boolean
    friendSearchMessage: string | null
    sendingRequestIds: string[]
    onSearchQueryChange: (value: string) => void
    onSearch: (e: React.FormEvent) => void
    onSendFriendRequest: (userId: string) => void
    onAcceptFriendRequest: (friendshipId: string) => void
    onRemoveFriend: (friendshipId: string) => void
    onClearSearchMessage: () => void
}

function FriendsTab({
    friendsList, friendSearchQuery, friendSearchResults,
    isSearchingFriends, friendSearchMessage,
    onSearchQueryChange, onSearch, onSendFriendRequest,
    onAcceptFriendRequest, onRemoveFriend
}: FriendsTabProps) {
    const [selectedUser, setSelectedUser] = useState<any | null>(null)
    const [localFriendSearch, setLocalFriendSearch] = useState('')

    const isFriend = (userId: string) => friendsList.some(f => f.id === userId)
    const friendStatus = (userId: string) => friendsList.find(f => f.id === userId)?.friendshipStatus

    const acceptedFriends = friendsList.filter(f => f.friendshipStatus === 'accepted')
    const filteredFriends = acceptedFriends.filter(f => 
        f.username?.toLowerCase().includes(localFriendSearch.toLowerCase())
    )
    const onlineFriends = filteredFriends.filter(f => f.status === 'online' || f.status === 'in-game')
    const offlineFriends = filteredFriends.filter(f => f.status !== 'online' && f.status !== 'in-game')

    const renderFriendCard = (friend: FriendProfile) => (
        <div key={friend.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', transition: 'transform 0.2s, background 0.2s' }} onClick={() => setSelectedUser(friend)} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
                {friend.avatarUrl ? (
                    <img src={friend.avatarUrl} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon icon="mynaui:user" style={{ fontSize: '32px', color: 'rgba(255,255,255,0.7)' }} />
                    </div>
                )}
                <span style={{ position: 'absolute', bottom: '2px', right: '2px', width: '14px', height: '14px', borderRadius: '50%', background: friend.status === 'online' || friend.status === 'in-game' ? '#2ec4b6' : '#6c757d', border: '3px solid #1a1a1a' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', transition: 'color 0.2s', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-color, #e60012)'} onMouseLeave={e => e.currentTarget.style.color = '#fff'}>{friend.username}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{friend.status === 'online' || friend.status === 'in-game' ? 'En línea' : 'Desconectado'}</div>
            </div>
        </div>
    )

    return (
        <div className="cp-section">
            <form onSubmit={onSearch} className="cp-form" style={{ background: 'transparent', border: 'none', padding: 0, marginBottom: '24px' }}>
                <div className="cp-form__title" style={{ marginBottom: '12px' }}>Añadir amigos</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="Buscar por nombre de usuario..."
                           value={friendSearchQuery}
                           onChange={e => { onSearchQueryChange(e.target.value) }}
                           style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }} />
                    <button type="submit" disabled={isSearchingFriends}
                            style={{ padding: '10px 16px', borderRadius: '8px', background: 'var(--accent-color, #e60012)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        {isSearchingFriends ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>
            </form>

            {friendSearchMessage && (
                <div style={{ padding: '12px 16px', background: 'rgba(255, 183, 3, 0.1)', border: '1px solid rgba(255, 183, 3, 0.3)', borderRadius: '8px', color: '#ffb703', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon icon="mynaui:info-circle" style={{ fontSize: '18px', flexShrink: 0 }} />
                    <span>{friendSearchMessage}</span>
                </div>
            )}

            {friendSearchResults.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <div className="cp-form__title" style={{ marginBottom: '12px' }}>Resultados de búsqueda</div>
                    <ul className="cp-list">
                        {friendSearchResults.map(user => (
                            <li key={user.id} className="cp-list-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setSelectedUser(user)}>
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon icon="mynaui:user" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)' }} />
                                        </div>
                                    )}
                                    <div>
                                        <div className="cp-list__item-name" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-color, #e60012)'} onMouseLeave={e => e.currentTarget.style.color = ''}>{user.username}</div>
                                    </div>
                                </div>
                                <button
                                    disabled={isFriend(user.id)}
                                    onClick={() => onSendFriendRequest(user.id)}
                                    style={{ padding: '6px 12px', borderRadius: '6px', background: isFriend(user.id) ? 'transparent' : 'rgba(255,255,255,0.1)', color: isFriend(user.id) ? 'rgba(255,255,255,0.5)' : '#fff', border: 'none', cursor: isFriend(user.id) ? 'default' : 'pointer', fontSize: '13px' }}>
                                    {friendStatus(user.id) === 'accepted' ? 'Amigos' : isFriend(user.id) ? 'Pendiente' : 'Enviar solicitud'}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {friendsList.filter(f => f.friendshipStatus === 'pending').length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <div className="cp-form__title" style={{ marginBottom: '12px', color: '#ffb703' }}>Solicitudes pendientes</div>
                    <ul className="cp-list">
                        {friendsList.filter(f => f.friendshipStatus === 'pending').map(req => (
                            <li key={req.id} className="cp-list-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setSelectedUser(req)}>
                                    {req.avatarUrl ? (
                                        <img src={req.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon icon="mynaui:user" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)' }} />
                                        </div>
                                    )}
                                    <div>
                                        <div className="cp-list__item-name" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-color, #e60012)'} onMouseLeave={e => e.currentTarget.style.color = ''}>{req.username}</div>
                                        <div className="cp-list__item-sub">{!req.isSender ? 'Te ha enviado una solicitud' : 'Solicitud enviada'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!req.isSender && (
                                        <button onClick={() => onAcceptFriendRequest(req.id)}
                                                style={{ padding: '6px 12px', borderRadius: '6px', background: '#2ec4b6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                                            Aceptar
                                        </button>
                                    )}
                                    <button onClick={() => onRemoveFriend(req.id)}
                                            style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                                        Rechazar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div>
                <div className="cp-form__title" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Mis Amigos ({friendsList.filter(f => f.friendshipStatus === 'accepted').length})</span>
                    {friendsList.filter(f => f.friendshipStatus === 'accepted').length > 0 && (
                        <div style={{ position: 'relative' }}>
                            <Icon icon="mynaui:search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '18px' }} />
                            <input
                                type="text"
                                placeholder="Filtrar amigos..."
                                value={localFriendSearch}
                                onChange={e => setLocalFriendSearch(e.target.value)}
                                style={{
                                    padding: '8px 14px 8px 36px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    outline: 'none',
                                    width: '200px',
                                    fontSize: '13px'
                                }}
                            />
                        </div>
                    )}
                </div>
                {acceptedFriends.length === 0 ? (
                    <div className="cp-empty" style={{ padding: '30px', textAlign: 'center', opacity: 0.6 }}>
                        <Icon icon="mynaui:users" style={{ fontSize: '36px', marginBottom: '8px' }} />
                        <div>Aún no tienes amigos añadidos en tu lista.</div>
                    </div>
                ) : (
                    <>
                        {filteredFriends.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>No se encontraron amigos con ese nombre.</div>
                        )}

                        {onlineFriends.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, marginBottom: '12px' }}>En línea ({onlineFriends.length})</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                                    {onlineFriends.map(renderFriendCard)}
                                </div>
                            </div>
                        )}

                        {onlineFriends.length > 0 && offlineFriends.length > 0 && (
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '24px 0' }} />
                        )}

                        {offlineFriends.length > 0 && (
                            <div>
                                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5, marginBottom: '12px' }}>Desconectados ({offlineFriends.length})</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', opacity: 0.7 }}>
                                    {offlineFriends.map(renderFriendCard)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {selectedUser && (
                <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
            )}
        </div>
    )
}

export default FriendsTab

