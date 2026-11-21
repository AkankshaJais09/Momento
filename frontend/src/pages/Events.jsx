// Events management page with desktop sidebar, mobile top bar, and interactive members management.
// Displays the list of events, stats, members drawer, invite link generation, and photo gallery.

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FolderPlus,
  KeyRound,
  Shield,
  Search,
  RefreshCw,
  Trash2,
  LogOut,
  X,
  UserCheck,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import {
  api,
  getEventMembers,
  removeEventMember,
  getEventStats,
} from '../api';
import CreateEvent from './CreateEvent';
import PhotoGallery from '../components/PhotoGallery';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return null;
  }

  const options = { month: 'short', day: 'numeric', year: 'numeric' };

  if (startDate && endDate) {
    const start = new Date(startDate).toLocaleDateString(undefined, options);
    const end = new Date(endDate).toLocaleDateString(undefined, options);
    return `${start} to ${end}`;
  }

  if (startDate) {
    return `Starting ${new Date(startDate).toLocaleDateString(undefined, options)}`;
  }

  return `Ending ${new Date(endDate).toLocaleDateString(undefined, options)}`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Events() {
  const { id: routeEventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  useDocumentMeta('My Events - PhotoDrop', 'Manage and view your shared photo events.');

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(routeEventId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [eventSearch, setEventSearch] = useState('');

  // Join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Members modal state
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingUserId, setRemovingUserId] = useState(null);

  // Event stats state
  const [eventStats, setEventStats] = useState(null);

  // Delete & Leave modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeavingEvent, setIsLeavingEvent] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);

  // Fetch list of events the logged-in user belongs to
  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/events/');
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          setEvents(list);

          if (routeEventId) {
            setSelectedEventId(routeEventId);
          } else if (list.length > 0) {
            setSelectedEventId((prev) => prev || list[0].id || list[0].pk);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load your events.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [routeEventId]);

  const selectedEvent = events.find(
    (e) => String(e.id || e.pk) === String(selectedEventId)
  );

  const isOwner = selectedEvent?.my_role === 'owner';

  // Load event stats when selected event changes
  useEffect(() => {
    if (!selectedEvent) {
      setEventStats(null);
      return;
    }
    const currentId = selectedEvent.id || selectedEvent.pk;
    async function fetchStats() {
      try {
        const stats = await getEventStats(currentId);
        setEventStats(stats);
      } catch {
        setEventStats(null);
      }
    }
    fetchStats();
  }, [selectedEvent]);

  // Load members for modal
  const openMembersModal = async () => {
    if (!selectedEvent) return;
    setShowMembersModal(true);
    setLoadingMembers(true);
    const currentId = selectedEvent.id || selectedEvent.pk;
    try {
      const data = await getEventMembers(currentId);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message || 'Failed to load event members.', 'danger');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Remove a member (owner only)
  const handleRemoveMember = async (targetUserId, targetName) => {
    if (!selectedEvent) return;
    const currentId = selectedEvent.id || selectedEvent.pk;
    setRemovingUserId(targetUserId);
    try {
      await removeEventMember(currentId, targetUserId);
      setMembers((prev) => prev.filter((m) => String(m.user_id) !== String(targetUserId)));
      // Update local member count
      setEvents((prev) =>
        prev.map((e) =>
          String(e.id || e.pk) === String(currentId)
            ? { ...e, member_count: Math.max(1, (e.member_count || 1) - 1) }
            : e
        )
      );
      showToast(`Removed ${targetName || 'member'} from event.`, 'info');
    } catch (err) {
      showToast(err.message || 'Could not remove member.', 'danger');
    } finally {
      setRemovingUserId(null);
    }
  };

  // Regenerate invite code (owner only)
  const handleRegenerateInviteCode = async () => {
    if (!selectedEvent) return;
    const currentId = selectedEvent.id || selectedEvent.pk;
    setIsRegeneratingCode(true);
    try {
      const res = await api.post(`/events/${currentId}/regenerate-invite-code/`);
      const updatedCode = res.invite_code;
      setEvents((prev) =>
        prev.map((e) =>
          String(e.id || e.pk) === String(currentId) ? { ...e, invite_code: updatedCode } : e
        )
      );
      showToast('New invite code generated. Old links are now expired.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to regenerate invite code.', 'danger');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  // Delete event (owner only)
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    const currentId = selectedEvent.id || selectedEvent.pk;
    setIsDeletingEvent(true);
    try {
      await api.delete(`/events/${currentId}/`);
      setShowDeleteModal(false);
      const remaining = events.filter((e) => String(e.id || e.pk) !== String(currentId));
      setEvents(remaining);
      showToast('Event deleted successfully.', 'success');
      if (remaining.length > 0) {
        const nextId = remaining[0].id || remaining[0].pk;
        setSelectedEventId(nextId);
        navigate(`/events/${nextId}`);
      } else {
        setSelectedEventId(null);
        navigate('/events');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete event.', 'danger');
    } finally {
      setIsDeletingEvent(false);
    }
  };

  // Leave event (member only)
  const handleLeaveEvent = async () => {
    if (!selectedEvent) return;
    const currentId = selectedEvent.id || selectedEvent.pk;
    setIsLeavingEvent(true);
    try {
      await api.post(`/events/${currentId}/leave/`);
      setShowLeaveModal(false);
      const remaining = events.filter((e) => String(e.id || e.pk) !== String(currentId));
      setEvents(remaining);
      showToast('You left the event.', 'info');
      if (remaining.length > 0) {
        const nextId = remaining[0].id || remaining[0].pk;
        setSelectedEventId(nextId);
        navigate(`/events/${nextId}`);
      } else {
        setSelectedEventId(null);
        navigate('/events');
      }
    } catch (err) {
      showToast(err.message || 'Failed to leave event.', 'danger');
    } finally {
      setIsLeavingEvent(false);
    }
  };

  // Copy full invite link to clipboard
  const handleCopyInviteLink = (inviteCode) => {
    if (!inviteCode) return;
    const inviteUrl = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(inviteCode);
    showToast('Invitation link copied to clipboard.', 'success');
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  // Callback when a new event is created
  const handleEventCreated = (newEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
    const newId = newEvent.id || newEvent.pk;
    setSelectedEventId(newId);
    setIsCreating(false);
    showToast('Event album created successfully.', 'success');
    navigate(`/events/${newId}`);
  };

  // Submit manual invite code to join an event
  const handleManualJoin = async (e) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim();
    if (!cleanCode) {
      setJoinError('Please enter a valid invite code.');
      return;
    }

    setIsJoining(true);
    setJoinError('');
    try {
      const response = await api.post('/events/join/', { invite_code: cleanCode });
      setShowJoinModal(false);
      setJoinCodeInput('');

      // Refresh events list
      const updatedEvents = await api.get('/events/');
      setEvents(updatedEvents);

      const targetId = response.event?.id || response.event?.pk;
      if (targetId) {
        setSelectedEventId(targetId);
        showToast('Joined event successfully.', 'success');
        navigate(`/events/${targetId}`);
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to join event with this code.');
    } finally {
      setIsJoining(false);
    }
  };

  // Filtered events in sidebar
  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return events;
    const q = eventSearch.toLowerCase().trim();
    return events.filter((e) => (e.name || '').toLowerCase().includes(q));
  }, [events, eventSearch]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 120px)',
      }}
    >
      {/* Mobile Top Bar */}
      <div
        className="mobile-events-bar"
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-subtle)',
          padding: 'var(--space-3) var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: events.length > 0 ? 'var(--space-2)' : 0,
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
            My Events ({events.length})
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
            >
              <KeyRound size={13} />
              <span>Join</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                navigate('/events');
              }}
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
            >
              <Plus size={13} />
              <span>Create</span>
            </button>
          </div>
        </div>

        {events.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              overflowX: 'auto',
              paddingBottom: 'var(--space-1)',
            }}
          >
            {events.map((evt) => {
              const evtId = evt.id || evt.pk;
              const isSelected = !isCreating && String(selectedEventId) === String(evtId);
              return (
                <button
                  key={evtId}
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedEventId(evtId);
                    navigate(`/events/${evtId}`);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '0.375rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-bg)',
                    color: isSelected ? 'var(--color-accent-fg)' : 'var(--color-text)',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {evt.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="events-layout-container"
        style={{
          display: 'flex',
          flex: 1,
        }}
      >
        {/* Desktop Left Sidebar */}
        <aside
          className="desktop-events-sidebar"
          style={{
            width: '300px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-subtle)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Sidebar Header */}
          <div
            style={{
              padding: 'var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                margin: 0,
                color: 'var(--color-text)',
              }}
            >
              My Events
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="btn btn-secondary"
                style={{ padding: '0.3125rem 0.625rem', fontSize: '0.75rem' }}
                title="Join an event with an invite code"
              >
                <KeyRound size={13} />
                <span>Join</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  navigate('/events');
                }}
                className="btn btn-primary"
                style={{ padding: '0.3125rem 0.625rem', fontSize: '0.75rem' }}
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Quick Search for Events */}
          {events.length > 3 && (
            <div style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Filter events..."
                  className="input"
                  style={{ paddingLeft: '1.75rem', fontSize: '0.75rem', height: '30px' }}
                />
              </div>
            </div>
          )}

          {/* Events List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'var(--space-8)',
                  gap: 'var(--space-2)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                <Loader2 size={16} className="animate-spin" color="var(--color-accent)" />
                <span>Loading events...</span>
              </div>
            )}

            {!loading && events.length === 0 && (
              <div
                style={{
                  padding: 'var(--space-6) var(--space-4)',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                <p style={{ margin: '0 0 var(--space-3) 0' }}>No events found.</p>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  <Plus size={14} />
                  <span>Create first event</span>
                </button>
              </div>
            )}

            {!loading &&
              filteredEvents.map((evt) => {
                const evtId = evt.id || evt.pk;
                const isSelected = !isCreating && String(selectedEventId) === String(evtId);
                const dates = formatDateRange(evt.start_date, evt.end_date);

                return (
                  <button
                    key={evtId}
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedEventId(evtId);
                      navigate(`/events/${evtId}`);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 'var(--space-3)',
                      marginBottom: 'var(--space-1)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-accent)' : 'transparent',
                      backgroundColor: isSelected ? 'var(--color-bg)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
                      display: 'block',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-1)',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: '0.875rem',
                          color: 'var(--color-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {evt.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            evt.my_role === 'owner' ? 'rgba(2, 132, 199, 0.15)' : 'var(--color-bg-muted)',
                          color:
                            evt.my_role === 'owner' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          fontWeight: 600,
                          flexShrink: 0,
                          textTransform: 'capitalize',
                        }}
                      >
                        {evt.my_role || 'member'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} />
                        {evt.member_count || 1} {evt.member_count === 1 ? 'member' : 'members'}
                      </span>
                      {dates && (
                        <span
                          style={{
                            maxWidth: '120px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dates}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: 'var(--space-6) var(--space-6)',
            overflowY: 'auto',
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {isCreating ? (
            <CreateEvent
              onCreated={handleEventCreated}
              onCancel={() => {
                setIsCreating(false);
                if (events.length > 0 && !selectedEventId) {
                  setSelectedEventId(events[0].id || events[0].pk);
                }
              }}
            />
          ) : selectedEvent ? (
            <div>
              {/* Event Header Banner with Ocean styling and Quick Stats */}
              <div
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: 'var(--space-6)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <div>
                    <h1
                      style={{
                        fontSize: '1.75rem',
                        fontWeight: 700,
                        margin: '0 0 var(--space-2) 0',
                        color: 'var(--color-text)',
                      }}
                    >
                      {selectedEvent.name}
                    </h1>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {/* Members pill */}
                      <button
                        type="button"
                        onClick={openMembersModal}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-1)',
                          color: 'var(--color-accent)',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                        }}
                      >
                        <Users size={16} />
                        <span>
                          {selectedEvent.member_count || 1}{' '}
                          {selectedEvent.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </button>

                      {/* Photo stats */}
                      {eventStats && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <Sparkles size={16} color="var(--color-ocean-teal)" />
                          <span>
                            {eventStats.total_photos} photos ({formatBytes(eventStats.total_size_bytes)})
                          </span>
                        </div>
                      )}

                      {formatDateRange(selectedEvent.start_date, selectedEvent.end_date) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <Calendar size={16} />
                          <span>
                            {formatDateRange(selectedEvent.start_date, selectedEvent.end_date)}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Shield size={16} />
                        <span style={{ textTransform: 'capitalize' }}>
                          Role: {selectedEvent.my_role || 'member'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions: Copy link, Members, Regenerate Code, Leave / Delete */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(selectedEvent.invite_code)}
                      className="btn btn-secondary"
                      style={{ padding: '0.4375rem 0.875rem', fontSize: '0.8125rem' }}
                      title="Copy public invitation link"
                    >
                      {copiedCode === selectedEvent.invite_code ? (
                        <>
                          <Check size={15} color="var(--color-success)" />
                          <span style={{ color: 'var(--color-success)' }}>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={15} />
                          <span>Copy invite link</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={openMembersModal}
                      className="btn btn-secondary"
                      style={{ padding: '0.4375rem 0.75rem', fontSize: '0.8125rem' }}
                      title="View all event members"
                    >
                      <Users size={15} />
                      <span>Members</span>
                    </button>

                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          onClick={handleRegenerateInviteCode}
                          disabled={isRegeneratingCode}
                          className="btn btn-secondary"
                          style={{ padding: '0.4375rem 0.75rem', fontSize: '0.8125rem' }}
                          title="Generate a new invite code and expire old links"
                        >
                          <RefreshCw size={14} className={isRegeneratingCode ? 'animate-spin' : ''} />
                          <span>New code</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowDeleteModal(true)}
                          className="btn btn-danger"
                          style={{ padding: '0.4375rem 0.75rem', fontSize: '0.8125rem' }}
                          title="Delete this event"
                        >
                          <Trash2 size={14} />
                          <span>Delete event</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLeaveModal(true)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4375rem 0.75rem', fontSize: '0.8125rem', color: 'var(--color-danger)' }}
                        title="Leave this event"
                      >
                        <LogOut size={14} />
                        <span>Leave event</span>
                      </button>
                    )}
                  </div>
                </div>

                {selectedEvent.description && (
                  <p
                    style={{
                      fontSize: '0.9375rem',
                      color: 'var(--color-text)',
                      margin: 'var(--space-3) 0 0 0',
                      lineHeight: 1.5,
                      maxWidth: '720px',
                    }}
                  >
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              {/* Event Photos Gallery with isOwner passed */}
              <PhotoGallery
                key={selectedEvent.id || selectedEvent.pk}
                eventId={selectedEvent.id || selectedEvent.pk}
                isOwner={isOwner}
              />
            </div>
          ) : (
            /* Empty State */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                textAlign: 'center',
                padding: 'var(--space-8)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                  color: 'var(--color-accent)',
                }}
              >
                <FolderPlus size={28} />
              </div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  marginBottom: 'var(--space-2)',
                  color: 'var(--color-text)',
                }}
              >
                No events yet
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  maxWidth: '360px',
                  lineHeight: 1.5,
                  marginBottom: 'var(--space-6)',
                }}
              >
                Create your first event album to start collecting full-quality photos from everyone in your group.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="btn btn-primary"
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  <Plus size={16} />
                  <span>Create an event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="btn btn-secondary"
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  <KeyRound size={16} />
                  <span>Join with code</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Interactive Members Modal */}
      {showMembersModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', backgroundColor: 'var(--color-bg-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Users size={18} color="var(--color-accent)" />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Event Members ({members.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingMembers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}>
                <Loader2 size={20} className="animate-spin" color="var(--color-accent)" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '340px', overflowY: 'auto' }}>
                {members.map((m) => {
                  const initial = (m.display_name || m.email || 'M').charAt(0).toUpperCase();
                  const isMemberOwner = m.role === 'owner';
                  const isMe = String(m.user_id) === String(user?.id);

                  return (
                    <div
                      key={m.id || m.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--space-2) var(--space-3)',
                        backgroundColor: 'var(--color-bg)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isMemberOwner ? 'var(--color-accent)' : 'var(--color-ocean-teal)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                              {m.display_name || m.email}
                            </span>
                            {isMe && (
                              <span style={{ fontSize: '0.6875rem', color: 'var(--color-accent)', fontWeight: 500 }}>
                                (You)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            {m.email}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '0.125rem 0.375rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isMemberOwner ? 'rgba(2, 132, 199, 0.15)' : 'var(--color-bg-muted)',
                            color: isMemberOwner ? 'var(--color-accent)' : 'var(--color-text-muted)',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {m.role}
                        </span>

                        {isOwner && !isMemberOwner && !isMe && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.user_id, m.display_name || m.email)}
                            disabled={removingUserId === m.user_id}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                            title="Remove member from event"
                          >
                            <UserMinus size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => handleCopyInviteLink(selectedEvent.invite_code)}
                className="btn btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
              >
                <Copy size={14} />
                <span>Copy invite link</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMembersModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Join Modal */}
      {showJoinModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                margin: '0 0 var(--space-2) 0',
                color: 'var(--color-text)',
              }}
            >
              Join an Event
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
                margin: '0 0 var(--space-4) 0',
              }}
            >
              Enter the invite code you received from the event organizer to access this shared album.
            </p>

            {joinError && (
              <div
                role="alert"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {joinError}
              </div>
            )}

            <form onSubmit={handleManualJoin}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  htmlFor="manual-invite-code"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    marginBottom: 'var(--space-1)',
                    color: 'var(--color-text)',
                  }}
                >
                  Invite code
                </label>
                <input
                  id="manual-invite-code"
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="e.g. 7mR_k20aBCd"
                  className="input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinError('');
                    setJoinCodeInput('');
                  }}
                  disabled={isJoining}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="btn btn-primary"
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <span>Join event</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <div className="card" style={{ maxWidth: '420px', width: '100%', backgroundColor: 'var(--color-bg-subtle)' }}>
            <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Delete &quot;{selectedEvent?.name}&quot;?
            </h3>
            <p style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Are you sure? This will permanently delete this event, all uploaded photos, and remove all memberships. This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingEvent}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeletingEvent}
                className="btn btn-danger"
              >
                {isDeletingEvent ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete event</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Event Confirmation Modal */}
      {showLeaveModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <div className="card" style={{ maxWidth: '420px', width: '100%', backgroundColor: 'var(--color-bg-subtle)' }}>
            <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Leave &quot;{selectedEvent?.name}&quot;?
            </h3>
            <p style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              You will lose access to this event and its photos unless someone shares a new invite link with you.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                disabled={isLeavingEvent}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeaveEvent}
                disabled={isLeavingEvent}
                className="btn btn-danger"
              >
                {isLeavingEvent ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Leaving...</span>
                  </>
                ) : (
                  <span>Leave event</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
