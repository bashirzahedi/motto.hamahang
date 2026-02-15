import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type SloganVote } from '../lib/supabase';
import { getAnonymousId } from '../lib/anonymousId';

export interface VoteInfo {
  score: number;
  likes: number;
  dislikes: number;
  userVote: number | null; // +1, -1, or null
}

export interface UseSloganVoteReturn {
  votes: Map<string, VoteInfo>;
  vote: (slangId: string, value: 1 | -1) => Promise<void>;
  isLoading: boolean;
}

export function useSloganVote() {
  const [votes, setVotes] = useState<Map<string, VoteInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const voterIdRef = useRef<string | null>(null);
  const fetchVotesRef = useRef<() => Promise<void>>(null!);

  const fetchVotes = useCallback(async () => {
    const voterId = voterIdRef.current;
    if (!voterId) return;

    const [scoresRes, allVotesRes, userVotesRes] = await Promise.all([
      supabase.from('slangs').select('id, vote_score'),
      supabase.from('slogan_votes').select('slang_id, vote'),
      supabase.from('slogan_votes').select('slang_id, vote').eq('voter_id', voterId),
    ]);

    const likesMap = new Map<string, number>();
    const dislikesMap = new Map<string, number>();
    for (const v of allVotesRes.data || []) {
      if (v.vote === 1) {
        likesMap.set(v.slang_id, (likesMap.get(v.slang_id) || 0) + 1);
      } else if (v.vote === -1) {
        dislikesMap.set(v.slang_id, (dislikesMap.get(v.slang_id) || 0) + 1);
      }
    }

    const map = new Map<string, VoteInfo>();
    for (const s of scoresRes.data || []) {
      map.set(s.id, {
        score: s.vote_score ?? 0,
        likes: likesMap.get(s.id) || 0,
        dislikes: dislikesMap.get(s.id) || 0,
        userVote: null,
      });
    }
    for (const v of userVotesRes.data || []) {
      const existing = map.get(v.slang_id);
      if (existing) {
        existing.userVote = v.vote;
      } else {
        map.set(v.slang_id, { score: 0, likes: 0, dislikes: 0, userVote: v.vote });
      }
    }

    setVotes(map);
    setIsLoading(false);
  }, []);

  // Keep a stable ref so the realtime callback always calls the latest version
  fetchVotesRef.current = fetchVotes;

  useEffect(() => {
    const init = async () => {
      voterIdRef.current = await getAnonymousId();
      fetchVotesRef.current?.();
    };
    init();

    const subscription = supabase
      .channel('slogan-votes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slogan_votes' },
        () => { fetchVotesRef.current?.(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const vote = useCallback(async (slangId: string, value: 1 | -1) => {
    const voterId = voterIdRef.current;
    if (!voterId) return;

    const current = votes.get(slangId);
    const currentUserVote = current?.userVote ?? null;
    const currentScore = current?.score ?? 0;
    const currentLikes = current?.likes ?? 0;
    const currentDislikes = current?.dislikes ?? 0;

    // Toggle: if user taps same vote, remove it
    const isToggle = currentUserVote === value;
    const newUserVote = isToggle ? null : value;
    const scoreDelta = isToggle
      ? -value // removing a +1 → -1, removing a -1 → +1
      : (currentUserVote != null ? value - currentUserVote : value); // switching or new

    // Calculate likes/dislikes delta
    let likesDelta = 0;
    let dislikesDelta = 0;
    if (isToggle) {
      if (value === 1) likesDelta = -1;
      else dislikesDelta = -1;
    } else {
      if (value === 1) { likesDelta = 1; if (currentUserVote === -1) dislikesDelta = -1; }
      else { dislikesDelta = 1; if (currentUserVote === 1) likesDelta = -1; }
    }

    // Optimistic update
    setVotes((prev) => {
      const next = new Map(prev);
      next.set(slangId, {
        score: currentScore + scoreDelta,
        likes: currentLikes + likesDelta,
        dislikes: currentDislikes + dislikesDelta,
        userVote: newUserVote,
      });
      return next;
    });

    try {
      const { data: result, error } = await supabase.rpc('submit_vote', {
        p_slang_id: slangId,
        p_voter_id: voterId,
        p_vote: isToggle ? 0 : value,
      });

      if (error) throw error;

      if (result === 'rate_limited') {
        setVotes((prev) => {
          const next = new Map(prev);
          next.set(slangId, { score: currentScore, likes: currentLikes, dislikes: currentDislikes, userVote: currentUserVote });
          return next;
        });
        return;
      }
    } catch (err) {
      console.warn('[useSloganVote] Vote error:', err);
      setVotes((prev) => {
        const next = new Map(prev);
        next.set(slangId, { score: currentScore, likes: currentLikes, dislikes: currentDislikes, userVote: currentUserVote });
        return next;
      });
    }
  }, [votes]);

  return { votes, vote, isLoading };
}
