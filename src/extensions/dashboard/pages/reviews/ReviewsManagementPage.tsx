import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Cell,
  Dropdown,
  FormField,
  Input,
  InputArea,
  Layout,
  Loader,
  Page,
  SectionHelper,
  Text,
  ToggleSwitch,
} from '@wix/design-system';
import {
  fetchReviewsConfig,
  fetchReviewsList,
  lookupGooglePlaceId,
  removeReviewRecord,
  saveReviewRecord,
  saveReviewsConfig,
  syncGoogleReviewsFromApi,
  type PlaceCandidate,
} from '../../cms/notary-cms-api';
import type { ReviewRecord } from '../../cms/types';

type FilterMode = 'all' | 'approved' | 'hidden';

const STAR_OPTIONS = [
  { id: '5', value: '5 Stars (★★★★★)' },
  { id: '4', value: '4 Stars (★★★★☆)' },
  { id: '3', value: '3 Stars (★★★☆☆)' },
  { id: '2', value: '2 Stars (★★☆☆☆)' },
  { id: '1', value: '1 Star (★☆☆☆☆)' },
];

function renderStars(rating: number): string {
  const safe = Math.max(1, Math.min(5, Math.round(rating || 5)));
  return '★'.repeat(safe) + '☆'.repeat(5 - safe);
}

export const ReviewsManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [notice, setNotice] = useState<{ type: 'standard' | 'warning' | 'danger' | 'success'; text: string } | null>(
    null,
  );
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [googleReviewLink, setGoogleReviewLink] = useState('');
  const [hasApiKey, setHasApiKey] = useState(true);

  const [searchQuery, setSearchQuery] = useState('Direct Mobile Notary Charlotte NC');
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualRating, setManualRating] = useState('5');
  const [manualText, setManualText] = useState('');
  const [manualRelativeTime, setManualRelativeTime] = useState('Verified Client');
  const [manualApproved, setManualApproved] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, list] = await Promise.all([fetchReviewsConfig(), fetchReviewsList()]);
      setGooglePlaceId(cfg.googlePlaceId || '');
      setGoogleReviewLink(cfg.googleReviewLink || '');
      setHasApiKey(cfg.hasApiKey);
      setReviews(list);
    } catch (err) {
      setNotice({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to load reviews from CMS.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setNotice(null);
    try {
      const saved = await saveReviewsConfig({ googlePlaceId, googleReviewLink });
      setGooglePlaceId(saved.googlePlaceId);
      setGoogleReviewLink(saved.googleReviewLink);
      setNotice({ type: 'success', text: 'Google Place ID and review link saved.' });
    } catch (err) {
      setNotice({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Could not save Google Business Profile settings.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleLookupPlace = async () => {
    setSearchingPlace(true);
    setNotice(null);
    try {
      const found = await lookupGooglePlaceId(searchQuery);
      setCandidates(found);
      if (found.length === 0) {
        setNotice({
          type: 'warning',
          text: 'No Google listing matched that search. Try your exact Google Business Profile name + city, or paste your Place ID directly.',
        });
      }
    } catch (err) {
      setNotice({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Place lookup failed.',
      });
    } finally {
      setSearchingPlace(false);
    }
  };

  const handleSelectCandidate = async (candidate: PlaceCandidate) => {
    setGooglePlaceId(candidate.placeId);
    if (candidate.googleMapsUri && !googleReviewLink) {
      setGoogleReviewLink(candidate.googleMapsUri);
    }
    setCandidates([]);
    setNotice({
      type: 'standard',
      text: `Selected "${candidate.name}". Click "Save & Sync Google Reviews" to import reviews.`,
    });
  };

  const handleSyncReviews = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      if (googlePlaceId.trim()) {
        await saveReviewsConfig({ googlePlaceId, googleReviewLink });
      }
      const res = await syncGoogleReviewsFromApi(googlePlaceId.trim() || undefined);
      if (res.googleMapsUri && !googleReviewLink) {
        setGoogleReviewLink(res.googleMapsUri);
      }
      const updatedList = await fetchReviewsList();
      setReviews(updatedList);
      setNotice({
        type: 'success',
        text: `Synced ${res.fetchedCount} review(s) from Google (${res.addedCount} new, ${res.updatedCount} updated). New reviews start Hidden until you approve them.`,
      });
    } catch (err) {
      setNotice({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Google review sync failed.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleApproved = async (review: ReviewRecord) => {
    setTogglingId(review._id);
    setNotice(null);
    const nextApproved = !review.approved;
    try {
      const saved = await saveReviewRecord({
        ...review,
        approved: nextApproved,
      });
      setReviews((prev) => prev.map((r) => (r._id === review._id ? saved : r)));
    } catch (err) {
      setNotice({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to update approval status.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddManualReview = async () => {
    if (!manualName.trim() || !manualText.trim()) {
      setNotice({ type: 'warning', text: 'Please enter both reviewer name and review text.' });
      return;
    }
    setSavingManual(true);
    setNotice(null);
    try {
      const created = await saveReviewRecord({
        reviewerName: manualName.trim(),
        rating: Number(manualRating || 5),
        reviewText: manualText.trim(),
        relativeTime: manualRelativeTime.trim() || 'Verified Client',
        source: 'Direct',
        approved: manualApproved,
        sortOrder: reviews.length + 1,
      });
      setReviews((prev) => [created, ...prev]);
      setManualName('');
      setManualText('');
      setManualRating('5');
      setManualRelativeTime('Verified Client');
      setManualApproved(true);
      setShowManualForm(false);
      setNotice({ type: 'success', text: 'Client review added to CustomerReviews CMS.' });
    } catch (err) {
      setNotice({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to add review.',
      });
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteReview = async (review: ReviewRecord) => {
    setDeletingId(review._id);
    setNotice(null);
    try {
      await removeReviewRecord(review._id);
      setReviews((prev) => prev.filter((r) => r._id !== review._id));
      setNotice({ type: 'success', text: `Deleted review from ${review.reviewerName}.` });
    } catch (err) {
      setNotice({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to delete review.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const approvedCount = useMemo(() => reviews.filter((r) => r.approved).length, [reviews]);
  const hiddenCount = reviews.length - approvedCount;

  const filteredReviews = useMemo(() => {
    if (filterMode === 'approved') return reviews.filter((r) => r.approved);
    if (filterMode === 'hidden') return reviews.filter((r) => !r.approved);
    return reviews;
  }, [reviews, filterMode]);

  return (
    <Page>
      <Page.Header
        title="Customer Reviews & Google Business Profile Sync"
        subtitle="Sync reviews from your Google Business Profile via Google Places API and choose exactly which reviews appear on your website."
        actionsBar={
          <Box gap="SP2">
            <Button priority="secondary" onClick={() => setShowManualForm((v) => !v)}>
              {showManualForm ? 'Close Add Form' : '+ Add Client Testimonial'}
            </Button>
            <Button onClick={handleSyncReviews} disabled={syncing || !googlePlaceId.trim()}>
              {syncing ? 'Syncing Google...' : 'Sync Reviews from Google'}
            </Button>
          </Box>
        }
      />
      <Page.Content>
        {loading ? (
          <Box align="center" padding="SP8">
            <Loader size="medium" />
          </Box>
        ) : (
          <Layout>
            {notice && (
              <Cell span={12}>
                <SectionHelper
                  appearance={notice.type}
                  onClose={() => setNotice(null)}
                >
                  {notice.text}
                </SectionHelper>
              </Cell>
            )}

            {!hasApiKey && (
              <Cell span={12}>
                <SectionHelper appearance="warning">
                  Google Places API Key is not detected yet. Add GOOGLE_PLACES_API_KEY in Wix Secrets Manager (or OwnerSettings) to enable one-click Google Business Profile sync.
                </SectionHelper>
              </Cell>
            )}

            <Cell span={12}>
              <Card>
                <Card.Header
                  title="Google Business Profile Connection"
                  subtitle="Uses your existing Google Cloud Places API key ($0 extra plugin cost). Newly synced reviews stay Hidden until you approve them."
                />
                <Card.Divider />
                <Card.Content>
                  <Layout>
                    <Cell span={5}>
                      <FormField label="Google Place ID">
                        <Input
                          placeholder="e.g. ChIJ..."
                          value={googlePlaceId}
                          onChange={(e) => setGooglePlaceId(e.target.value)}
                        />
                      </FormField>
                    </Cell>
                    <Cell span={5}>
                      <FormField label="Google Review Button Link (Optional)">
                        <Input
                          placeholder="https://g.page/r/.../review or Google Maps link"
                          value={googleReviewLink}
                          onChange={(e) => setGoogleReviewLink(e.target.value)}
                        />
                      </FormField>
                    </Cell>
                    <Cell span={2}>
                      <Box paddingTop="22px">
                        <Button
                          fullWidth
                          priority="secondary"
                          onClick={handleSaveConfig}
                          disabled={savingConfig}
                        >
                          {savingConfig ? 'Saving...' : 'Save Settings'}
                        </Button>
                      </Box>
                    </Cell>

                    <Cell span={9}>
                      <FormField label="Need your Place ID? Search your Google listing">
                        <Input
                          placeholder="Direct Mobile Notary & Verification Services Charlotte NC"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </FormField>
                    </Cell>
                    <Cell span={3}>
                      <Box paddingTop="22px">
                        <Button
                          fullWidth
                          priority="secondary"
                          onClick={handleLookupPlace}
                          disabled={searchingPlace}
                        >
                          {searchingPlace ? 'Searching...' : 'Find Place ID'}
                        </Button>
                      </Box>
                    </Cell>

                    {candidates.length > 0 && (
                      <Cell span={12}>
                        <Box direction="vertical" gap="SP1" paddingTop="SP2">
                          <Text size="small" weight="bold">
                            Select your Google Business Profile listing:
                          </Text>
                          {candidates.map((c) => (
                            <Box
                              key={c.placeId}
                              align="space-between"
                              verticalAlign="middle"
                              padding="SP2"
                              border="1px solid #e4dbf6"
                              backgroundColor="#faf8fd"
                            >
                              <Box direction="vertical">
                                <Text size="small" weight="bold">
                                  {c.name} {c.rating ? `(${c.rating}★ · ${c.userRatingCount ?? 0} reviews)` : ''}
                                </Text>
                                <Text size="tiny" secondary>
                                  {c.address} · ID: {c.placeId}
                                </Text>
                              </Box>
                              <Button size="small" onClick={() => handleSelectCandidate(c)}>
                                Use This Listing
                              </Button>
                            </Box>
                          ))}
                        </Box>
                      </Cell>
                    )}
                  </Layout>
                </Card.Content>
              </Card>
            </Cell>

            {showManualForm && (
              <Cell span={12}>
                <Card>
                  <Card.Header title="Add Manual Client Testimonial" />
                  <Card.Divider />
                  <Card.Content>
                    <Layout>
                      <Cell span={4}>
                        <FormField label="Client Name">
                          <Input
                            placeholder="e.g. Sarah M."
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                          />
                        </FormField>
                      </Cell>
                      <Cell span={4}>
                        <FormField label="Star Rating">
                          <Dropdown
                            selectedId={manualRating}
                            options={STAR_OPTIONS}
                            onSelect={(opt) => setManualRating(String(opt?.id || '5'))}
                          />
                        </FormField>
                      </Cell>
                      <Cell span={4}>
                        <FormField label="Label / Time">
                          <Input
                            placeholder="e.g. Huntersville, NC · 2 weeks ago"
                            value={manualRelativeTime}
                            onChange={(e) => setManualRelativeTime(e.target.value)}
                          />
                        </FormField>
                      </Cell>
                      <Cell span={12}>
                        <FormField label="Review Text">
                          <InputArea
                            rows={3}
                            placeholder="Paste the client's approved testimonial..."
                            value={manualText}
                            onChange={(e) => setManualText(e.target.value)}
                          />
                        </FormField>
                      </Cell>
                      <Cell span={12}>
                        <Box align="space-between" verticalAlign="middle">
                          <Box verticalAlign="middle" gap="SP2">
                            <ToggleSwitch
                              checked={manualApproved}
                              onChange={() => setManualApproved((v) => !v)}
                            />
                            <Text size="small">
                              {manualApproved ? 'Approved (Show on website immediately)' : 'Hidden (Save as draft)'}
                            </Text>
                          </Box>
                          <Button onClick={handleAddManualReview} disabled={savingManual}>
                            {savingManual ? 'Saving...' : 'Save Review'}
                          </Button>
                        </Box>
                      </Cell>
                    </Layout>
                  </Card.Content>
                </Card>
              </Cell>
            )}

            <Cell span={12}>
              <Card>
                <Card.Header
                  title={`Review Approval Queue (${reviews.length} total)`}
                  subtitle="Only reviews toggled ON (Approved) appear inside the Customer Reviews widget on your live website."
                  suffix={
                    <Box gap="SP1">
                      <Button
                        size="small"
                        priority={filterMode === 'all' ? 'primary' : 'secondary'}
                        onClick={() => setFilterMode('all')}
                      >
                        All ({reviews.length})
                      </Button>
                      <Button
                        size="small"
                        priority={filterMode === 'approved' ? 'primary' : 'secondary'}
                        onClick={() => setFilterMode('approved')}
                      >
                        Approved ({approvedCount})
                      </Button>
                      <Button
                        size="small"
                        priority={filterMode === 'hidden' ? 'primary' : 'secondary'}
                        onClick={() => setFilterMode('hidden')}
                      >
                        Hidden ({hiddenCount})
                      </Button>
                    </Box>
                  }
                />
                <Card.Divider />
                <Card.Content>
                  {filteredReviews.length === 0 ? (
                    <Box direction="vertical" align="center" padding="SP6" gap="SP2">
                      <Text weight="bold">No reviews in this view yet</Text>
                      <Text size="small" secondary>
                        Enter your Google Place ID above and click "Sync Reviews from Google", or add an approved testimonial manually.
                      </Text>
                    </Box>
                  ) : (
                    <Box direction="vertical" gap="SP2">
                      {filteredReviews.map((rev) => (
                        <Box
                          key={rev._id}
                          padding="SP3"
                          border={rev.approved ? '1px solid #4b247a' : '1px solid #e5e7eb'}
                          backgroundColor={rev.approved ? '#faf8fd' : '#ffffff'}
                          align="space-between"
                          verticalAlign="top"
                          gap="SP4"
                        >
                          <Box direction="vertical" gap="SP1" style={{ flex: 1 }}>
                            <Box verticalAlign="middle" gap="SP2">
                              <Text weight="bold">{rev.reviewerName}</Text>
                              <Text size="small" style={{ color: '#d97706', fontWeight: 700 }}>
                                {renderStars(rev.rating)} ({rev.rating}/5)
                              </Text>
                              <Badge size="small" skin={rev.source === 'Google' ? 'standard' : 'neutral'}>
                                {rev.source}
                              </Badge>
                              <Badge size="small" skin={rev.approved ? 'success' : 'warning'}>
                                {rev.approved ? 'Approved · Live' : 'Hidden'}
                              </Badge>
                            </Box>
                            {rev.relativeTime && (
                              <Text size="tiny" secondary>
                                {rev.relativeTime}
                              </Text>
                            )}
                            <Text size="small">
                              {rev.reviewText || '(Star rating only — no written comment)'}
                            </Text>
                          </Box>

                          <Box direction="vertical" align="right" gap="SP2" style={{ minWidth: '170px' }}>
                            <Box verticalAlign="middle" gap="SP2">
                              <Text size="tiny" weight="bold">
                                {rev.approved ? 'Show on Site' : 'Hidden'}
                              </Text>
                              <ToggleSwitch
                                checked={rev.approved}
                                disabled={togglingId === rev._id}
                                onChange={() => void handleToggleApproved(rev)}
                              />
                            </Box>
                            <Button
                              size="tiny"
                              priority="secondary"
                              skin="destructive"
                              disabled={deletingId === rev._id}
                              onClick={() => void handleDeleteReview(rev)}
                            >
                              {deletingId === rev._id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Card.Content>
              </Card>
            </Cell>
          </Layout>
        )}
      </Page.Content>
    </Page>
  );
};
