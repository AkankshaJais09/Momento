// Photo Gallery component featuring CSS columns masonry layout, multi-filter tags,
// live photo search and sort, file drag-and-drop upload with per-file progress bars,
// interactive multi-selection with batch zip download and batch delete,
// favorite like toggles, and an interactive keyboard-navigable lightbox with zoom and metadata inspection.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  UploadCloud,
  Download,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Search,
  ArrowUpDown,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  Check,
  User,
  Clock,
  HardDrive,
} from 'lucide-react';
import {
  api,
  uploadPhotoWithProgress,
  downloadEventPhotosZip,
  batchDeletePhotos,
} from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function PhotoGallery({ eventId, isOwner = false }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter & Search & Sort state
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'mine' | 'favorites' | 'YYYY-MM-DD'
  const [availableDays, setAvailableDays] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'

  // Selection state for batch actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [zipError, setZipError] = useState('');

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLightboxInfo, setShowLightboxInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [singleDeleting, setSingleDeleting] = useState(false);

  // Upload queue state: array of { id, file, name, size, progress, status, error, previewUrl }
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Build query string based on active filter and page
  const buildQuery = useCallback((pageNum, filter) => {
    const params = new URLSearchParams();
    params.set('page', pageNum);

    if (filter === 'mine') {
      params.set('mine', 'true');
    } else if (filter === 'favorites') {
      params.set('favorites', 'true');
    } else if (filter && filter !== 'all') {
      params.set('day', filter);
    }

    return params.toString();
  }, []);

  // Fetch photos from API
  const fetchPhotos = useCallback(
    async (pageNum = 1, filter = activeFilter, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const query = buildQuery(pageNum, filter);
        const data = await api.get(`/events/${eventId}/photos/?${query}`);
        const fetched = data.results || [];

        if (append) {
          setPhotos((prev) => [...prev, ...fetched]);
        } else {
          setPhotos(fetched);
        }

        setPage(data.current_page || pageNum);
        setTotalPages(data.total_pages || 1);

        // Collect distinct days for calendar filter tags
        if (!append && fetched.length > 0) {
          const daysSet = new Set();
          fetched.forEach((p) => {
            if (p.taken_at) {
              daysSet.add(p.taken_at.slice(0, 10));
            }
          });
          setAvailableDays(Array.from(daysSet));
        }
      } catch (err) {
        setError(err.message || 'Failed to load photos.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [eventId, activeFilter, buildQuery]
  );

  // Reload photos when active filter or eventId changes
  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
    fetchPhotos(1, activeFilter, false);
  }, [eventId, activeFilter, fetchPhotos]);

  // Load next page
  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchPhotos(page + 1, activeFilter, true);
    }
  };

  // Keyboard navigation & zoom reset for lightbox
  useEffect(() => {
    if (lightboxIndex === null) {
      setZoomLevel(1);
      setShowLightboxInfo(false);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false);
        } else {
          setLightboxIndex(null);
        }
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1 < photos.length ? prev + 1 : 0));
        setZoomLevel(1);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 >= 0 ? prev - 1 : photos.length - 1));
        setZoomLevel(1);
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel((prev) => Math.min(prev + 0.25, 3));
      } else if (e.key === '-') {
        setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length, showDeleteModal]);

  // Like / Unlike toggle
  const handleToggleLike = async (photoId, e) => {
    if (e) e.stopPropagation();

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const isLiked = photo.liked_by_me;
    // Optimistic UI update
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === photoId) {
          return {
            ...p,
            liked_by_me: !isLiked,
            like_count: isLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1,
          };
        }
        return p;
      })
    );

    try {
      if (isLiked) {
        await api.delete(`/photos/${photoId}/like/`);
      } else {
        await api.post(`/photos/${photoId}/like/`);
        showToast('Photo added to favorites.', 'info');
      }
    } catch {
      // Revert on failure
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id === photoId) {
            return {
              ...p,
              liked_by_me: isLiked,
              like_count: photo.like_count,
            };
          }
          return p;
        })
      );
      showToast('Could not update favorite status.', 'danger');
    }
  };

  // Toggle selection on a photo
  const handleToggleSelect = (photoId, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === displayedPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedPhotos.map((p) => p.id)));
    }
  };

  // Batch download selected photos as a zip archive
  const handleDownloadZip = async () => {
    if (selectedIds.size === 0) return;

    if (selectedIds.size > 50) {
      setZipError('Maximum 50 photos can be downloaded in a single zip archive.');
      showToast('Maximum 50 photos per zip archive.', 'warning');
      return;
    }

    setDownloadingZip(true);
    setZipError('');
    showToast(`Preparing zip archive for ${selectedIds.size} photos...`, 'info');
    try {
      await downloadEventPhotosZip(eventId, Array.from(selectedIds));
      showToast('Zip archive downloaded.', 'success');
      setSelectedIds(new Set());
    } catch (err) {
      setZipError(err.message || 'Failed to download zip file.');
      showToast(err.message || 'Download failed.', 'danger');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Batch delete selected photos
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const result = await batchDeletePhotos(eventId, Array.from(selectedIds));
      const deletedCount = result.deleted_count || selectedIds.size;
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setShowBatchDeleteModal(false);
      showToast(`Deleted ${deletedCount} photos.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete selected photos.', 'danger');
    } finally {
      setBatchDeleting(false);
    }
  };

  // Delete a single photo from lightbox
  const handleDeleteSinglePhoto = async (photoId) => {
    setSingleDeleting(true);
    try {
      await api.delete(`/photos/${photoId}/`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setShowDeleteModal(false);
      setLightboxIndex(null);
      showToast('Photo deleted successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete photo.', 'danger');
    } finally {
      setSingleDeleting(false);
    }
  };

  // Process and upload a list of selected files with previews and progress
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    // Client validation: Max 25MB per file
    const maxSizeBytes = 25 * 1024 * 1024;
    const validFiles = [];
    for (const f of fileList) {
      if (f.size > maxSizeBytes) {
        showToast(`${f.name} exceeds the 25MB limit.`, 'danger');
      } else {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) return;

    const newQueueItems = validFiles.map((file, idx) => ({
      id: `${Date.now()}_${idx}_${file.name}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending',
      error: null,
      previewUrl: URL.createObjectURL(file),
    }));

    setUploadQueue((prev) => [...newQueueItems, ...prev]);

    let successCount = 0;
    for (const item of newQueueItems) {
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
      );

      try {
        const uploadedResult = await uploadPhotoWithProgress(
          eventId,
          item.file,
          (percent) => {
            setUploadQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
            );
          }
        );

        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, progress: 100, status: 'complete' } : q
          )
        );

        const newPhotoList = Array.isArray(uploadedResult)
          ? uploadedResult
          : [uploadedResult];
        setPhotos((prev) => [...newPhotoList, ...prev]);
        successCount += 1;
      } catch (uploadErr) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', error: uploadErr.message }
              : q
          )
        );
      }
    }

    if (successCount > 0) {
      showToast(`Uploaded ${successCount} photo${successCount === 1 ? '' : 's'} successfully.`, 'success');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Filter and sort photos in memory for search query and sort order
  const displayedPhotos = useMemo(() => {
    let result = [...photos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const uploaderName = (p.uploader?.display_name || '').toLowerCase();
        const uploaderEmail = (p.uploader?.email || '').toLowerCase();
        const filename = (p.original_filename || '').toLowerCase();
        return (
          uploaderName.includes(q) ||
          uploaderEmail.includes(q) ||
          filename.includes(q)
        );
      });
    }

    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.taken_at || a.created_at) - new Date(b.taken_at || b.created_at));
    } else {
      result.sort((a, b) => new Date(b.taken_at || b.created_at) - new Date(a.taken_at || a.created_at));
    }

    return result;
  }, [photos, searchQuery, sortOrder]);

  const currentLightboxPhoto =
    lightboxIndex !== null ? photos[lightboxIndex] : null;

  const canDeleteLightboxPhoto =
    currentLightboxPhoto &&
    (isOwner ||
      (currentLightboxPhoto.uploader &&
        String(currentLightboxPhoto.uploader.id) === String(user?.id)));

  return (
    <div>
      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: '2px dashed',
          borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
          backgroundColor: isDragging ? 'var(--color-accent-subtle)' : 'var(--color-bg-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6) var(--space-4)',
          textAlign: 'center',
          marginBottom: 'var(--space-6)',
          transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg-muted)',
            color: 'var(--color-accent)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <UploadCloud size={24} />
        </div>

        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            margin: '0 0 var(--space-1) 0',
            color: 'var(--color-text)',
          }}
        >
          Drag and drop photos here, or click to upload
        </h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            margin: '0 0 var(--space-3) 0',
          }}
        >
          Supports full resolution JPEG, PNG, and WebP up to 25MB each.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-primary"
          style={{ padding: '0.4375rem 1rem', fontSize: '0.8125rem' }}
        >
          <UploadCloud size={15} />
          <span>Choose photos to upload</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              handleUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Upload Queue List */}
      {uploadQueue.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Upload Activity ({uploadQueue.filter((q) => q.status === 'complete').length} of {uploadQueue.length} done)
            </span>
            <button
              type="button"
              onClick={() => setUploadQueue((prev) => prev.filter((q) => q.status !== 'complete'))}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            >
              Clear completed
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <ImageIcon size={20} color="var(--color-text-muted)" />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name} ({formatBytes(item.size)})
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color:
                          item.status === 'complete'
                            ? 'var(--color-success)'
                            : item.status === 'error'
                            ? 'var(--color-danger)'
                            : 'var(--color-accent)',
                      }}
                    >
                      {item.status === 'complete'
                        ? 'Done'
                        : item.status === 'error'
                        ? item.error || 'Failed'
                        : `${item.progress}%`}
                    </span>
                  </div>

                  <div className="upload-progress-track">
                    <div
                      className="upload-progress-fill"
                      style={{
                        width: `${item.progress}%`,
                        backgroundColor:
                          item.status === 'error'
                            ? 'var(--color-danger)'
                            : item.status === 'complete'
                            ? 'var(--color-success)'
                            : 'var(--color-accent)',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Controls Bar: Filters, Search, Sort & Multi-Select toggle */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* Top row: Filter tags */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`filter-tag ${activeFilter === 'all' ? 'filter-tag-active' : ''}`}
          >
            All photos ({photos.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('mine')}
            className={`filter-tag ${activeFilter === 'mine' ? 'filter-tag-active' : ''}`}
          >
            My uploads
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('favorites')}
            className={`filter-tag ${activeFilter === 'favorites' ? 'filter-tag-active' : ''}`}
          >
            <Heart size={13} />
            <span>Favorites</span>
          </button>

          {availableDays.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveFilter(activeFilter === day ? 'all' : day)}
              className={`filter-tag ${activeFilter === day ? 'filter-tag-active' : ''}`}
            >
              <Calendar size={13} />
              <span>{day}</span>
            </button>
          ))}
        </div>

        {/* Bottom row: Search input, Sort toggle, and Select All button */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          {/* Live Search */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '320px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 'var(--space-3)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by uploader or name..."
              className="input"
              style={{
                paddingLeft: '2.25rem',
                paddingRight: searchQuery ? '2rem' : 'var(--space-3)',
                fontSize: '0.8125rem',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 'var(--space-2)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort & Multi-Select buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              className="btn btn-secondary"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
              title="Toggle sort order"
            >
              <ArrowUpDown size={14} />
              <span>{sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
            </button>

            {displayedPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="btn btn-secondary"
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
              >
                {selectedIds.size === displayedPhotos.length ? (
                  <>
                    <Square size={14} />
                    <span>Deselect all</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={14} />
                    <span>Select all</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
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

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-12)',
            gap: 'var(--space-2)',
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
          }}
        >
          <Loader2 size={20} className="animate-spin" color="var(--color-accent)" />
          <span>Loading gallery photos...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedPhotos.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-4)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-3)',
              color: 'var(--color-accent)',
            }}
          >
            <ImageIcon size={24} />
          </div>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              margin: '0 0 var(--space-1) 0',
              color: 'var(--color-text)',
            }}
          >
            No photos found
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '380px',
              margin: '0 auto var(--space-4) auto',
              lineHeight: 1.5,
            }}
          >
            {searchQuery
              ? `No photos matched "${searchQuery}".`
              : activeFilter !== 'all'
              ? 'No photos match the selected filter. Try switching back to all photos.'
              : 'Be the first to upload photos to this event album.'}
          </p>
          {(searchQuery || activeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="btn btn-secondary"
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Photo Masonry Grid */}
      {!loading && displayedPhotos.length > 0 && (
        <div className="photo-grid-columns">
          {displayedPhotos.map((photo, index) => {
            const isSelected = selectedIds.has(photo.id);
            const isLiked = Boolean(photo.liked_by_me);

            return (
              <div
                key={photo.id}
                className="photo-grid-item"
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-bg-muted)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const originalIndex = photos.findIndex((p) => p.id === photo.id);
                  setLightboxIndex(originalIndex >= 0 ? originalIndex : index);
                }}
              >
                <img
                  src={photo.thumbnail_url || photo.original_url}
                  alt={photo.original_filename || 'Event photo'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    display: 'block',
                    objectFit: 'cover',
                  }}
                />

                {/* Top Overlay: Selection Checkbox */}
                <div
                  style={{
                    position: 'absolute',
                    top: 'var(--space-2)',
                    left: 'var(--space-2)',
                    zIndex: 10,
                  }}
                  onClick={(e) => handleToggleSelect(photo.id, e)}
                >
                  <button
                    type="button"
                    aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                    style={{
                      background: isSelected ? 'var(--color-accent)' : 'rgba(8, 29, 47, 0.75)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.4)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </div>

                {/* Bottom Overlay: Like button & Uploader pill */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'var(--space-2)',
                    left: 'var(--space-2)',
                    right: 'var(--space-2)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-1)',
                    pointerEvents: 'none',
                  }}
                >
                  {/* Uploader name */}
                  <span
                    style={{
                      background: 'rgba(8, 29, 47, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {photo.uploader?.display_name || photo.uploader?.email || 'Member'}
                  </span>

                  {/* Like button */}
                  <div style={{ pointerEvents: 'auto' }} onClick={(e) => handleToggleLike(photo.id, e)}>
                    <button
                      type="button"
                      aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
                      style={{
                        background: 'rgba(8, 29, 47, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 7px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: isLiked ? '#ef4444' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      <Heart
                        size={13}
                        fill={isLiked ? '#ef4444' : 'transparent'}
                        color={isLiked ? '#ef4444' : '#ffffff'}
                      />
                      <span>{photo.like_count || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Load More */}
      {!loading && page < totalPages && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary"
            style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Loading more photos...</span>
              </>
            ) : (
              <span>Load more photos</span>
            )}
          </button>
        </div>
      )}

      {/* Floating Selection Bottom Bar */}
      {selectedIds.size > 0 && (
        <div className="selection-bottom-bar" role="toolbar" aria-label="Selected photos actions">
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'photo' : 'photos'} selected
          </div>

          {zipError && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>
              {zipError}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={downloadingZip || batchDeleting}
              className="btn btn-secondary"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip || batchDeleting}
              className="btn btn-primary"
              style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
            >
              {downloadingZip ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Preparing zip...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download zip</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowBatchDeleteModal(true)}
              disabled={downloadingZip || batchDeleting}
              className="btn btn-danger"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
              title="Delete selected photos"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && (
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
              Delete {selectedIds.size} selected photos?
            </h3>
            <p style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              This will permanently delete the selected photos you have permission to remove. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={batchDeleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="btn btn-danger"
              >
                {batchDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete photos</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Accessible Lightbox */}
      {currentLightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview lightbox"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(5, 16, 26, 0.95)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Large, always-visible close button — fixed top-right corner */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close lightbox"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 110,
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <X size={22} />
          </button>
          {/* Lightbox Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3) var(--space-6)',
              backgroundColor: 'rgba(10, 28, 45, 0.85)',
              borderBottom: '1px solid var(--color-border)',
              color: '#ffffff',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontWeight: 600, color: '#e0f2fe' }}>
                {lightboxIndex + 1} of {photos.length}
              </span>
              {currentLightboxPhoto.original_filename && (
                <span
                  style={{
                    color: '#82a8c6',
                    fontSize: '0.8125rem',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentLightboxPhoto.original_filename}
                </span>
              )}
            </div>

            {/* Lightbox Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {/* Zoom Controls */}
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                disabled={zoomLevel <= 0.5}
                className="btn btn-secondary"
                style={{ padding: '0.3125rem 0.5rem', color: '#ffffff' }}
                title="Zoom out (-)"
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', color: '#82a8c6', minWidth: '40px', textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                disabled={zoomLevel >= 3}
                className="btn btn-secondary"
                style={{ padding: '0.3125rem 0.5rem', color: '#ffffff' }}
                title="Zoom in (+)"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="btn btn-secondary"
                style={{ padding: '0.3125rem 0.5rem', color: '#ffffff' }}
                title="Reset zoom (0)"
              >
                <RotateCcw size={14} />
              </button>

              {/* Info drawer toggle */}
              <button
                type="button"
                onClick={() => setShowLightboxInfo((v) => !v)}
                className="btn btn-secondary"
                style={{
                  padding: '0.3125rem 0.625rem',
                  color: showLightboxInfo ? 'var(--color-accent)' : '#ffffff',
                  borderColor: showLightboxInfo ? 'var(--color-accent)' : 'var(--color-border)',
                }}
                title="Photo details"
              >
                <Info size={14} />
                <span>Info</span>
              </button>

              {/* Like button in lightbox */}
              <button
                type="button"
                onClick={() => handleToggleLike(currentLightboxPhoto.id)}
                className="btn btn-secondary"
                style={{
                  padding: '0.3125rem 0.625rem',
                  color: currentLightboxPhoto.liked_by_me ? '#ef4444' : '#ffffff',
                }}
                title={currentLightboxPhoto.liked_by_me ? 'Unlike' : 'Like'}
              >
                <Heart
                  size={14}
                  fill={currentLightboxPhoto.liked_by_me ? '#ef4444' : 'transparent'}
                />
                <span>{currentLightboxPhoto.like_count || 0}</span>
              </button>

              {/* Download original */}
              <a
                href={currentLightboxPhoto.original_url}
                download={currentLightboxPhoto.original_filename || 'photo.jpg'}
                className="btn btn-primary"
                style={{ padding: '0.3125rem 0.75rem', fontSize: '0.8125rem' }}
              >
                <Download size={14} />
                <span>Download</span>
              </a>

              {/* Delete button (if owner or uploader) */}
              {canDeleteLightboxPhoto && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-danger"
                  style={{ padding: '0.3125rem 0.625rem' }}
                  title="Delete this photo"
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* Close */}
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close lightbox"
                className="btn btn-secondary"
                style={{ padding: '0.3125rem 0.625rem', color: '#ffffff' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main Lightbox View Area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Prev button */}
            <button
              type="button"
              onClick={() => {
                setLightboxIndex((prev) => (prev - 1 >= 0 ? prev - 1 : photos.length - 1));
                setZoomLevel(1);
              }}
              aria-label="Previous photo"
              style={{
                backgroundColor: 'rgba(10, 28, 45, 0.75)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Central Zoomable Image */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '0 var(--space-4)',
                overflow: 'auto',
              }}
            >
              <img
                src={currentLightboxPhoto.medium_preview_url || currentLightboxPhoto.original_url}
                alt={currentLightboxPhoto.original_filename || 'Enlarged photo'}
                style={{
                  maxHeight: zoomLevel === 1 ? 'calc(100vh - 160px)' : 'none',
                  maxWidth: zoomLevel === 1 ? '100%' : 'none',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: 'transform 100ms ease',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            {/* Next button */}
            <button
              type="button"
              onClick={() => {
                setLightboxIndex((prev) => (prev + 1 < photos.length ? prev + 1 : 0));
                setZoomLevel(1);
              }}
              aria-label="Next photo"
              style={{
                backgroundColor: 'rgba(10, 28, 45, 0.75)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <ChevronRight size={24} />
            </button>

            {/* Side Info Drawer */}
            {showLightboxInfo && (
              <div
                style={{
                  position: 'absolute',
                  right: 'var(--space-4)',
                  top: 'var(--space-4)',
                  width: '280px',
                  backgroundColor: 'rgba(10, 28, 45, 0.95)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  zIndex: 20,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontWeight: 600, color: '#e0f2fe' }}>Photo Details</span>
                  <button
                    type="button"
                    onClick={() => setShowLightboxInfo(false)}
                    style={{ background: 'none', border: 'none', color: '#82a8c6', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <User size={14} color="var(--color-accent)" />
                    <span style={{ color: '#82a8c6' }}>Uploaded by:</span>
                    <span style={{ color: '#ffffff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentLightboxPhoto.uploader?.display_name || currentLightboxPhoto.uploader?.email || 'Unknown'}
                    </span>
                  </div>

                  {currentLightboxPhoto.taken_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Clock size={14} color="var(--color-accent)" />
                      <span style={{ color: '#82a8c6' }}>Date taken:</span>
                      <span style={{ color: '#ffffff' }}>
                        {new Date(currentLightboxPhoto.taken_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {currentLightboxPhoto.size_bytes && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <HardDrive size={14} color="var(--color-accent)" />
                      <span style={{ color: '#82a8c6' }}>File size:</span>
                      <span style={{ color: '#ffffff' }}>
                        {formatBytes(currentLightboxPhoto.size_bytes)}
                      </span>
                    </div>
                  )}

                  {currentLightboxPhoto.width && currentLightboxPhoto.height && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <ImageIcon size={14} color="var(--color-accent)" />
                      <span style={{ color: '#82a8c6' }}>Dimensions:</span>
                      <span style={{ color: '#ffffff' }}>
                        {currentLightboxPhoto.width} × {currentLightboxPhoto.height} px
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Single Delete Confirmation Modal */}
          {showDeleteModal && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 150,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-4)',
              }}
            >
              <div className="card" style={{ maxWidth: '400px', width: '100%', backgroundColor: 'var(--color-bg-subtle)' }}>
                <h3 style={{ margin: '0 0 var(--space-2) 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                  Delete this photo?
                </h3>
                <p style={{ margin: '0 0 var(--space-4) 0', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  This will permanently delete this photo from the event album. This cannot be undone.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={singleDeleting}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSinglePhoto(currentLightboxPhoto.id)}
                    disabled={singleDeleting}
                    className="btn btn-danger"
                  >
                    {singleDeleting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <span>Delete photo</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
