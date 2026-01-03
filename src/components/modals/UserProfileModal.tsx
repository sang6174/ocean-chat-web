import { X, Mail, Hash } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/common/Avatar';

interface UserProfileModalProps {
    onClose: () => void;
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
    const { currentUser } = useAuth();

    if (!currentUser) return null;

    const profile = currentUser;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">My Profile</h3>
                    <button onClick={onClose} className="modal-close">
                        <X size={24} />
                    </button>
                </div>

                <div className="profile-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <Avatar name={profile.name || profile.username} size="lg" />
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                        {profile.name || profile.username}
                    </h2>

                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                        @{profile.username}
                    </p>

                    <div style={{
                        width: '100%',
                        marginTop: '24px',
                        paddingTop: '24px',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>


                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                            <Hash size={18} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User ID</span>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{profile.id}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                            <Mail size={18} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{profile.email || 'No email provided'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
